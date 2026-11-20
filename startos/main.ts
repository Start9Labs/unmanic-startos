import { FileHelper } from '@start9labs/start-sdk'
import { manifest as filebrowserManifest } from 'filebrowser-quantum-startos/startos/manifest'
import { manifest as jellyfinManifest } from 'jellyfin-startos/startos/manifest'
import { manifest as nextexplorerManifest } from 'nextexplorer-startos/startos/manifest'
import { manifest as radarrManifest } from 'radarr-startos/startos/manifest'
import { manifest as sonarrManifest } from 'sonarr-startos/startos/manifest'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  connectPlugin,
  filebrowserMountpoint,
  IntegrationId,
  integrationIds,
  integrations,
  nextexplorerMountpoint,
  removePlugin,
  uiPort,
} from './utils'

type Mounts = ReturnType<typeof sdk.Mounts.of>

const mountPublic: Record<IntegrationId, (mounts: Mounts) => Mounts> = {
  sonarr: (mounts) =>
    mounts.mountDependency<typeof sonarrManifest>({
      dependencyId: 'sonarr',
      volumeId: 'public',
      subpath: null,
      mountpoint: integrations.sonarr.mountpoint,
      readonly: true,
    }),
  radarr: (mounts) =>
    mounts.mountDependency<typeof radarrManifest>({
      dependencyId: 'radarr',
      volumeId: 'public',
      subpath: null,
      mountpoint: integrations.radarr.mountpoint,
      readonly: true,
    }),
  jellyfin: (mounts) =>
    mounts.mountDependency<typeof jellyfinManifest>({
      dependencyId: 'jellyfin',
      volumeId: 'public',
      subpath: null,
      mountpoint: integrations.jellyfin.mountpoint,
      readonly: true,
    }),
}

const retryAfterMs = 60_000

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting Unmanic!'))

  const store = await storeJson
    .read((s) => ({
      mediaSources: s.mediaSources,
      sonarr: s.sonarr,
      radarr: s.radarr,
      jellyfin: s.jellyfin,
    }))
    .const(effects)
  if (!store) throw new Error('store.json is missing')

  let mounts = sdk.Mounts.of()
    .mountVolume({
      volumeId: 'main',
      subpath: null,
      mountpoint: '/config',
      readonly: false,
    })
    .mountVolume({
      volumeId: 'cache',
      subpath: null,
      mountpoint: '/tmp/unmanic',
      readonly: false,
    })

  const installed = (id: 'filebrowser' | 'nextexplorer') =>
    sdk.getServiceManifest(effects, id, (m) => m !== null).const()
  if (
    store.mediaSources.includes('filebrowser') &&
    (await installed('filebrowser'))
  ) {
    mounts = mounts.mountDependency<typeof filebrowserManifest>({
      dependencyId: 'filebrowser',
      volumeId: 'data',
      subpath: null,
      mountpoint: filebrowserMountpoint,
      readonly: false,
    })
  }
  if (
    store.mediaSources.includes('nextexplorer') &&
    (await installed('nextexplorer'))
  ) {
    mounts = mounts.mountDependency<typeof nextexplorerManifest>({
      dependencyId: 'nextexplorer',
      volumeId: 'data',
      subpath: null,
      mountpoint: nextexplorerMountpoint,
      readonly: false,
    })
  }

  const connected = integrationIds.filter((id) => store[id] === 'on')
  const removing = integrationIds.filter((id) => store[id] === 'removing')

  // The address is null while the service is uninstalled, when its volume can't be mounted.
  const addresses = Object.fromEntries(
    await Promise.all(
      connected.map(
        async (id) =>
          [
            id,
            await sdk.host
              .getBridgeAddress(effects, {
                packageId: id,
                hostId: integrations[id].hostId,
                internalPort: integrations[id].port,
                ssl: false,
              })
              .const(),
          ] as const,
      ),
    ),
  ) as Partial<Record<IntegrationId, string | null>>

  for (const id of connected) {
    if (addresses[id]) mounts = mountPublic[id](mounts)
  }

  const subcontainer = sdk.SubContainer.of(
    effects,
    { imageId: 'unmanic' },
    mounts,
    'unmanic-sub',
  )

  const apiKeys: Partial<Record<IntegrationId, string | null>> = {}
  for (const id of connected) {
    apiKeys[id] = addresses[id]
      ? await FileHelper.string(
          `${await subcontainer.rootfs}${integrations[id].mountpoint}/api-key`,
        )
          .read(
            (key) => key.trim(),
            (prev, next) => next === null || prev === next,
          )
          .const(effects)
      : null
  }

  async function reconcile(): Promise<string | null> {
    for (const id of removing) {
      await removePlugin(integrations[id].pluginId)
      if ((await storeJson.read((s) => s[id]).once()) === 'removing')
        await storeJson.merge(effects, { [id]: 'off' })
    }
    for (const id of connected) {
      const { title: service, pluginId: plugin } = integrations[id]
      const address = addresses[id]
      const apiKey = apiKeys[id]
      if (!address) return i18n('${service} is not installed', { service })
      if (!apiKey)
        return i18n('${service} has not shared its API key yet', { service })
      try {
        await connectPlugin(
          plugin,
          integrations[id].settings(`http://${address}`, apiKey),
        )
      } catch (e) {
        return i18n('Could not set up the ${plugin} plugin: ${error}', {
          plugin,
          error: e instanceof Error ? e.message : String(e),
        })
      }
    }
    return null
  }

  let attempt: Promise<string | null> | null = null
  let failedAt = 0

  return (
    sdk.Daemons.of(effects)
      // The image's video-group step misses StartOS's bind-mounted GPU nodes, which are root:root 0660.
      .addOneshot('gpu-access', {
        subcontainer,
        exec: {
          command: [
            'sh',
            '-c',
            'if [ -d /dev/dri ]; then usermod -a -G root ubuntu; fi',
          ],
        },
        requires: [],
      })
      .addDaemon('primary', {
        subcontainer,
        exec: {
          command: sdk.useEntrypoint(),
          env: { PUID: '1000', PGID: '1000', TZ: 'Etc/UTC' },
        },
        ready: {
          display: i18n('Web Interface'),
          fn: () =>
            sdk.healthCheck.checkWebUrl(
              effects,
              `http://127.0.0.1:${uiPort}/unmanic/api/v2/version/read`,
              {
                successMessage: i18n('The web interface is ready'),
                errorMessage: i18n('The web interface is not ready'),
              },
            ),
        },
        requires: ['gpu-access'],
      })
      .addHealthCheck('integrations', () =>
        connected.length || removing.length
          ? {
              ready: {
                display: i18n('Integrations'),
                fn: async () => {
                  if (
                    !attempt ||
                    (failedAt && Date.now() - failedAt > retryAfterMs)
                  ) {
                    failedAt = 0
                    attempt = reconcile().catch((e) =>
                      e instanceof Error ? e.message : String(e),
                    )
                  }
                  const error = await attempt
                  if (error) {
                    failedAt ||= Date.now()
                    return { result: 'failure', message: error }
                  }
                  return connected.length
                    ? {
                        result: 'success',
                        message: i18n('Connected to ${services}', {
                          services: connected
                            .map((id) => integrations[id].title)
                            .join(', '),
                        }),
                      }
                    : { result: 'disabled' }
                },
              },
              requires: ['primary'],
            }
          : null,
      )
  )
})
