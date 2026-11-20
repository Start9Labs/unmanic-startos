# Unmanic

Unmanic rewrites your media files in place. Before you point a library at media you care about, try your plugin flow on a test folder.

## Documentation

- [Getting started](https://github.com/Unmanic/unmanic-documentation/blob/master/docs/using_unmanic/getting_started.mdx) — the upstream first-steps guide.
- [Workflow](https://github.com/Unmanic/unmanic-documentation/blob/master/docs/using_unmanic/workflow.mdx) — how a file moves from a library scan through the plugin flow to its replacement.
- [Configuring libraries](https://github.com/Unmanic/unmanic-documentation/blob/master/docs/configuration/libraries/configure_libraries.mdx) — library paths, the scanner, file monitoring and per-library plugin flows.
- [Workers](https://github.com/Unmanic/unmanic-documentation/blob/master/docs/configuration/workers.mdx) — worker groups and schedules.
- [Plugins](https://github.com/Unmanic/unmanic-documentation/blob/master/docs/configuration/plugins/overview.mdx) — installing and configuring plugins.

## What you get on StartOS

- A **Web UI** interface for the Unmanic dashboard and settings, behind a login that StartOS enforces.
- Read-write access to the media you keep in **FileBrowser Quantum** and/or **NextExplorer**, at `/mnt/filebrowser` and `/mnt/nextexplorer` — the same paths Sonarr, Radarr and Jellyfin use.
- One-click connections to **Sonarr**, **Radarr** and **Jellyfin** on this server, so each of them rescans a file after Unmanic changes it. You don't need to enter any addresses or API keys.
- Access to your server's graphics hardware for hardware-accelerated encoding, where your server has a supported GPU.

## Getting set up

1. Install **FileBrowser Quantum** or **NextExplorer**, and put your media there.
2. Run the **Media Storage** task and tick the file manager(s) that hold your media.
3. Run the **Set Admin Password** task. Copy the username and password it shows you.
4. Start Unmanic and open the **Web UI**. Sign in with those credentials when your browser asks.
5. In **Settings → Workers**, add a worker group with at least one worker. A fresh Unmanic has no workers, and files stay in the pending list until you add some.
6. In **Settings → Library**, set the library path to a folder under `/mnt/filebrowser` or `/mnt/nextexplorer`, such as `/mnt/filebrowser/tv` or `/mnt/nextexplorer/Files/Movies`. Turn on the library scanner or file monitor if you want new files picked up automatically.
7. In **Settings → Plugins**, install the plugins you want, such as **Transcode Video Files**, then add them to the library's plugin flow.

## Using Unmanic

### Web UI

The dashboard shows the pending list, active workers and completed tasks. Settings, libraries and plugins are all managed here. Your browser asks for the admin username and password the first time you open it.

### Connecting Sonarr, Radarr and Jellyfin

1. Run **Connect Sonarr**, **Connect Radarr** or **Connect Jellyfin**. Unmanic restarts, then installs that service's notify plugin and fills in its address and API key.
2. In the Unmanic Web UI, open your library's plugin flow and add **Notify Sonarr**, **Notify Radarr** or **Notify Jellyfin** to it. Unmanic runs a plugin only for libraries whose flow includes it.

The **Integrations** status on the Dashboard tab shows which services are connected, or why a connection could not be set up. Plugins download from the Unmanic plugin repository, so Unmanic needs internet access to connect a service.

Running the same action again disconnects that service. Unmanic then removes its notify plugin, together with its settings and its place in your library flows.

If you change a notify plugin's settings for one particular library, that library keeps your settings and does not receive updated connection details.

### Actions

- **Set Admin Password** — generates a new password for the Web UI and shows it. Your old password stops working at once.
- **Media Storage** — choose which file managers Unmanic can read and write. Unmanic restarts.
- **Connect / Disconnect Sonarr, Radarr, Jellyfin** — see above. Unmanic restarts, stopping any file it is processing.

## Limitations

- **Free Unmanic is limited to two libraries.** More need an Unmanic supporter account.
- **Media paths are fixed.** Unmanic sees your media only under `/mnt/filebrowser` and `/mnt/nextexplorer`.
