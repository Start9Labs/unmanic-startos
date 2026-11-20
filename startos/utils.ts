import {
  uiHostId as jellyfinHostId,
  uiPort as jellyfinPort,
} from 'jellyfin-startos/startos/utils'
import {
  uiHostId as radarrHostId,
  uiPort as radarrPort,
} from 'radarr-startos/startos/utils'
import {
  uiHostId as sonarrHostId,
  uiPort as sonarrPort,
} from 'sonarr-startos/startos/utils'
import { StoreType } from './fileModels/store.json'

export const uiPort = 8888
export const uiHostId = 'main'
export const adminUsername = 'admin'
// Shared media paths must match Sonarr, Radarr, qBittorrent and Jellyfin.
export const filebrowserMountpoint = '/mnt/filebrowser'
export const nextexplorerMountpoint = '/mnt/nextexplorer'

export const integrationIds = ['sonarr', 'radarr', 'jellyfin'] as const
export type IntegrationId = (typeof integrationIds)[number]
export type Connection = StoreType[IntegrationId]

export const integrations: Record<
  IntegrationId,
  {
    title: string
    hostId: string
    port: number
    pluginId: string
    mountpoint: string
    settings: (url: string, apiKey: string) => Record<string, string>
  }
> = {
  sonarr: {
    title: 'Sonarr',
    hostId: sonarrHostId,
    port: sonarrPort,
    pluginId: 'notify_sonarr',
    mountpoint: '/mnt/sonarr',
    settings: (url, apiKey) => ({ host_url: url, api_key: apiKey }),
  },
  radarr: {
    title: 'Radarr',
    hostId: radarrHostId,
    port: radarrPort,
    pluginId: 'notify_radarr',
    mountpoint: '/mnt/radarr',
    settings: (url, apiKey) => ({ host_url: url, api_key: apiKey }),
  },
  jellyfin: {
    title: 'Jellyfin',
    hostId: jellyfinHostId,
    port: jellyfinPort,
    pluginId: 'notify_jellyfin',
    mountpoint: '/mnt/jellyfin',
    settings: (url, apiKey) => ({
      'Jellyfin URL': url,
      'Jellyfin API Key': apiKey,
    }),
  },
}

type PluginSetting = { key: string; value: unknown }

async function api<A>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<A> {
  const res = await fetch(`http://127.0.0.1:${uiPort}/unmanic/api/v2${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(`${path}: ${res.status} ${text}`)
  return JSON.parse(text || 'null')
}

async function installedPlugin(pluginId: string) {
  const { results } = await api<{
    results: { id: number; plugin_id: string }[]
  }>('/plugins/installed', { start: 0, length: 1000 })
  return results.find((p) => p.plugin_id === pluginId) ?? null
}

// Leaves every setting it is not given as the user set it.
export async function connectPlugin(
  pluginId: string,
  values: Record<string, string>,
) {
  if (!(await installedPlugin(pluginId)))
    await api('/plugins/install', { plugin_id: pluginId })
  const { settings } = await api<{ settings: PluginSetting[] }>(
    '/plugins/info',
    { plugin_id: pluginId, prefer_local: true },
  )
  if (settings.every((s) => !(s.key in values) || s.value === values[s.key]))
    return
  await api('/plugins/settings/update', {
    plugin_id: pluginId,
    settings: settings.map((s) =>
      s.key in values ? { ...s, value: values[s.key] } : s,
    ),
  })
}

export async function removePlugin(pluginId: string) {
  const plugin = await installedPlugin(pluginId)
  if (plugin) await api('/plugins/remove', { id_list: [plugin.id] }, 'DELETE')
}
