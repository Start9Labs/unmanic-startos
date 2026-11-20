import { FileHelper, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

// 'removing' persists a disconnect until the plugin is gone from Unmanic.
const connection = z.enum(['off', 'on', 'removing']).catch('off')

const shape = z.looseObject({
  adminPassword: z.string().nullable().catch(null),
  mediaSources: z.array(z.enum(['filebrowser', 'nextexplorer'])).catch([]),
  sonarr: connection,
  radarr: connection,
  jellyfin: connection,
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: '/store.json' },
  shape,
)

export type StoreType = z.infer<typeof shape>
