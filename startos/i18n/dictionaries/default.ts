export const DEFAULT_LANG = 'en_US'

const dict = {
  // main.ts
  'Starting Unmanic!': 0,
  'Web Interface': 1,
  'The web interface is ready': 2,
  'The web interface is not ready': 3,
  Integrations: 4,
  'Connected to ${services}': 5,
  '${service} is not installed': 6,
  '${service} has not shared its API key yet': 7,
  'Could not update the ${plugin} plugin: ${error}': 8,

  // interfaces.ts
  'Web UI': 9,
  'The Unmanic web interface and API': 10,

  // actions/setAdminPassword.ts
  'Set Admin Password': 11,
  'Reset Admin Password': 12,
  'Generate a new random password for signing in to the Unmanic web interface.': 13,
  'Replaces the current admin password. The old password stops working.': 14,
  'Login Credentials': 15,
  'Use these credentials to sign in to Unmanic.': 16,
  Username: 17,
  Password: 18,

  // actions/mediaStorage.ts
  'Media Storage': 19,
  '- FileBrowser Quantum: mounted at /mnt/filebrowser\n- NextExplorer: mounted at /mnt/nextexplorer, one folder per location, such as /mnt/nextexplorer/Files': 20,
  'FileBrowser Quantum': 21,
  NextExplorer: 22,
  'Choose which file managers hold the media libraries Unmanic processes. Each one is mounted read-write, and changing the selection restarts Unmanic.': 23,

  // actions/connect.ts
  'Connect ${service}': 24,
  'Disconnect ${service}': 25,
  'Install and configure the ${plugin} plugin, which asks ${service} on this server to rescan a file once Unmanic has processed it. Changing it restarts Unmanic.': 26,
  'Removes the ${plugin} plugin from Unmanic and your library flows, and restarts Unmanic. Saved plugin settings are kept.': 27,
  'Restarts Unmanic, stopping any file it is processing.': 30,

  // init/tasks.ts
  'Set the admin password before signing in': 28,
  'Choose where your media libraries are stored': 29,
} as const

/**
 * Plumbing. DO NOT EDIT.
 */
export type I18nKey = keyof typeof dict
export type LangDict = Record<(typeof dict)[I18nKey], string>
export default dict
