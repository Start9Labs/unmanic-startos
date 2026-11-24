import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { IntegrationId, integrations } from '../utils'

const connectAction = (id: IntegrationId) => {
  const { title: service, pluginId: plugin } = integrations[id]
  return sdk.Action.withoutInput(
    `connect-${id}`,
    async ({ effects }) => {
      const connected =
        (await storeJson.read((s) => s[id]).const(effects)) === 'on'
      return {
        name: connected
          ? i18n('Disconnect ${service}', { service })
          : i18n('Connect ${service}', { service }),
        description: i18n(
          'Install and configure the ${plugin} plugin, which asks ${service} on this server to rescan a file once Unmanic has processed it. Changing it restarts Unmanic.',
          { plugin, service },
        ),
        warning: connected
          ? i18n(
              'Removes the ${plugin} plugin from Unmanic and your library flows, and restarts Unmanic. Saved plugin settings are kept.',
              { plugin },
            )
          : i18n('Restarts Unmanic, stopping any file it is processing.'),
        allowedStatuses: 'any',
        group: null,
        visibility: 'enabled',
      }
    },
    async ({ effects }) => {
      const current = await storeJson.read((s) => s[id]).once()
      await storeJson.merge(effects, {
        [id]: current === 'on' ? 'removing' : 'on',
      })
      return null
    },
  )
}

export const connectSonarr = connectAction('sonarr')
export const connectRadarr = connectAction('radarr')
export const connectJellyfin = connectAction('jellyfin')
