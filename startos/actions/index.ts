import { sdk } from '../sdk'
import { connectJellyfin, connectRadarr, connectSonarr } from './connect'
import { mediaStorage } from './mediaStorage'
import { setAdminPassword } from './setAdminPassword'

export const actions = sdk.Actions.of()
  .addAction(setAdminPassword)
  .addAction(mediaStorage)
  .addAction(connectSonarr)
  .addAction(connectRadarr)
  .addAction(connectJellyfin)
