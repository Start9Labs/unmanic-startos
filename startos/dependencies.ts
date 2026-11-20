import { T } from '@start9labs/start-sdk'
import { storeJson, StoreType } from './fileModels/store.json'
import {
  filebrowserDescription,
  jellyfinDescription,
  nextexplorerDescription,
  radarrDescription,
  sonarrDescription,
} from './manifest/i18n'
import { sdk } from './sdk'
import { IntegrationId } from './utils'

type Enabled = (options: { effects: T.Effects }) => Promise<boolean>

const selected =
  (id: StoreType['mediaSources'][number]): Enabled =>
  async ({ effects }) =>
    (await storeJson.read((s) => s.mediaSources).const(effects))?.includes(
      id,
    ) ?? false

const connected =
  (id: IntegrationId): Enabled =>
  async ({ effects }) =>
    (await storeJson.read((s) => s[id]).const(effects)) === 'on'

export const dependencies = sdk.Dependencies.of()
  .addDependency(
    sdk.Dependency.optional('filebrowser', {
      description: filebrowserDescription,
      metadata: {
        title: 'FileBrowser Quantum',
        icon: 'https://raw.githubusercontent.com/Start9Labs/filebrowser-quantum-startos/e936a6c85a97b930b43cad5e9c0dd4898a2df567/icon.svg',
      },
      versionRange: '>=#quantum:2.0.2-stable:3',
      kind: 'exists',
      enabled: selected('filebrowser'),
    }),
  )
  .addDependency(
    sdk.Dependency.optional('nextexplorer', {
      description: nextexplorerDescription,
      metadata: {
        title: 'NextExplorer',
        icon: 'https://raw.githubusercontent.com/Start9Labs/nextexplorer-startos/04f7ecbfc31ad2205e0222dd7568fb881aa06c79/icon.svg',
      },
      versionRange: '>=2.2.7:0',
      kind: 'exists',
      enabled: selected('nextexplorer'),
    }),
  )
  .addDependency(
    sdk.Dependency.optional('sonarr', {
      description: sonarrDescription,
      metadata: {
        title: 'Sonarr',
        icon: 'https://raw.githubusercontent.com/Start9Labs/sonarr-startos/1fd0ca56ec8ad8db79d3fe7f25d2fc026d369a74/icon.svg',
      },
      versionRange: '>=4.0.20.3014:1',
      kind: 'exists',
      enabled: connected('sonarr'),
    }),
  )
  .addDependency(
    sdk.Dependency.optional('radarr', {
      description: radarrDescription,
      metadata: {
        title: 'Radarr',
        icon: 'https://raw.githubusercontent.com/Start9Labs/radarr-startos/73fd3e144a766f02f9c628e4f31755b75973fbc3/icon.svg',
      },
      versionRange: '>=6.4.4.10685:1',
      kind: 'exists',
      enabled: connected('radarr'),
    }),
  )
  .addDependency(
    sdk.Dependency.optional('jellyfin', {
      description: jellyfinDescription,
      metadata: {
        title: 'Jellyfin',
        icon: 'https://raw.githubusercontent.com/Start9Labs/jellyfin-startos/9791d252e396c9a9a051de8cc21b05a1d68c743b/icon.svg',
      },
      versionRange: '>=12.4:6',
      kind: 'exists',
      enabled: connected('jellyfin'),
    }),
  )
