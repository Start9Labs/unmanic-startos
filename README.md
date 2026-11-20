<p align="center">
  <img src="icon.png" alt="Unmanic Logo" width="21%">
</p>

# Unmanic on StartOS

> Everything not listed in this document should behave the same as upstream
> Unmanic. If a feature, setting, or behavior is not mentioned here, the
> upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[Unmanic](https://github.com/Unmanic/unmanic) is a library optimiser: it runs media files through a flow of plugins and replaces each original in place. This package puts a StartOS login in front of it, mounts the media that FileBrowser Quantum and NextExplorer hold, and wires its notify plugins to Sonarr, Radarr and Jellyfin on the same server.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The image is upstream's own, unmodified, and one subcontainer runs it. Two build variants share that image and differ only in GPU access.

| Property      | Value                                                                     |
| ------------- | ------------------------------------------------------------------------- |
| Image         | `josh5/unmanic`, upstream unmodified                                      |
| Architectures | x86_64, aarch64                                                           |
| Entrypoint    | Upstream default, with `PUID`/`PGID` 1000 and `TZ` `Etc/UTC`              |
| Subcontainer  | `unmanic-sub` — the `gpu-access` oneshot and the `primary` daemon         |
| Variants      | `generic` (no hardware requirement) and `nvidia` (requires an NVIDIA GPU) |

The entrypoint starts as root, remaps its `ubuntu` user to uid/gid 1000 and runs Unmanic as that user, so files it writes into media folders are owned by 1000 — the uid FileBrowser Quantum, NextExplorer and the \*arr packages use.

Both variants set `hardwareAcceleration`, which passes the server's `/dev/dri` render nodes into the container; the `nvidia` variant also sets `nvidiaContainer`, which adds the NVIDIA runtime. StartOS presents the render nodes root-owned `0660`, and the image's own video-group setup does not recognise them, so the `gpu-access` oneshot adds `ubuntu` to group `root` before each start when `/dev/dri` exists.

## Volume and Data Layout

Three volumes belong to the package. Media is not one of them: it is mounted read-write from the file manager that owns it.

| Volume    | Mount point    | Contents                                                                                                       |
| --------- | -------------- | -------------------------------------------------------------------------------------------------------------- |
| `main`    | `/config`      | `.unmanic/config` (settings and the SQLite database), `.unmanic/plugins`, `.unmanic/userdata`, `.unmanic/logs` |
| `cache`   | `/tmp/unmanic` | Unmanic's encode cache — each file in progress is written here before it replaces the original                 |
| `startos` | — (host side)  | `store.json`                                                                                                   |

Dependency mounts:

| Mount point         | Source                                              | Access     |
| ------------------- | --------------------------------------------------- | ---------- |
| `/mnt/filebrowser`  | FileBrowser Quantum `data` volume                   | read-write |
| `/mnt/nextexplorer` | NextExplorer `data` volume, one folder per location | read-write |
| `/mnt/sonarr`       | Sonarr `public` volume, for `api-key`               | read-only  |
| `/mnt/radarr`       | Radarr `public` volume, for `api-key`               | read-only  |
| `/mnt/jellyfin`     | Jellyfin `public` volume, for `api-key`             | read-only  |

The media mount points match Sonarr, Radarr, qBittorrent and Jellyfin, so a path Unmanic reports is the same path those services know the file by. A file manager is mounted only while it is selected and installed; a `public` volume only while that service is connected and installed.

## File Models

The package owns one file, `store.json`. Unmanic's own settings, library definitions and plugin settings are written through Unmanic's API, never as files.

### store.json

StartOS-side state on the `startos` volume:

- `adminPassword` — the Web UI password; written only by **Set Admin Password**.
- `mediaSources` — the selected file managers; written only by **Media Storage**.
- `sonarr`, `radarr`, `jellyfin` — each `off`, `on` or `removing`; flipped by the connect actions. `removing` holds a disconnect until the plugin is gone from Unmanic, then returns to `off`.

### Notify plugin settings

While a service is connected, the `integrations` health check installs its plugin if missing and sets two keys in the plugin's global settings — `/config/.unmanic/userdata/<plugin>/settings.json`:

| Plugin            | Keys set                           |
| ----------------- | ---------------------------------- |
| `notify_sonarr`   | `host_url`, `api_key`              |
| `notify_radarr`   | `host_url`, `api_key`              |
| `notify_jellyfin` | `Jellyfin URL`, `Jellyfin API Key` |

The URL is the service's bridge address and the key is the one it publishes as `api-key` on its `public` volume. Both are re-asserted on every start, so a hand edit to them reverts. Every other key — Sonarr's update/import mode, file renaming, webhook rules — is the user's and is left as it is. A per-library `settings.<library-id>.json`, created when the user saves the plugin's settings from a library's flow, takes precedence over the global file and is never updated by the package.

## Dependencies

Every dependency is optional and `exists`, so none has to be running for Unmanic to start.

| Dependency          | Enabled when                  | Mount                                  | Why                                |
| ------------------- | ----------------------------- | -------------------------------------- | ---------------------------------- |
| FileBrowser Quantum | Selected in **Media Storage** | `/mnt/filebrowser`, read-write         | Where the media lives              |
| NextExplorer        | Selected in **Media Storage** | `/mnt/nextexplorer`, read-write        | Where the media lives              |
| Sonarr              | Connected                     | `public` at `/mnt/sonarr`, read-only   | Its API key, for `notify_sonarr`   |
| Radarr              | Connected                     | `public` at `/mnt/radarr`, read-only   | Its API key, for `notify_radarr`   |
| Jellyfin            | Connected                     | `public` at `/mnt/jellyfin`, read-only | Its API key, for `notify_jellyfin` |

A stopped Sonarr, Radarr or Jellyfin does not stop Unmanic; the notify plugin's request fails and Unmanic logs the error. Jellyfin must be a release that publishes `api-key`.

## Network Access and Interfaces

One interface serves both the web UI and Unmanic's REST API, behind a StartOS Basic-auth gate.

| Interface | Id   | Type | Port | Description                       |
| --------- | ---- | ---- | ---- | --------------------------------- |
| Web UI    | `ui` | ui   | 8888 | The Unmanic web interface and API |

The port is bound on the `main` MultiHost. Upstream Unmanic has no authentication, so the binding sets `proxy.auth` to Basic with the single credential `admin` / `adminPassword`, realm `Unmanic`. Every address — LAN, Tor, domains and the bridge address — is challenged, and the websocket the dashboard uses passes through with the browser's credentials. Package code reaches Unmanic on `127.0.0.1:8888` inside the container, which bypasses the gate.

Unmanic itself connects out to `api.unmanic.app` to register the installation at startup and to fetch the plugin repository, and to Sonarr, Radarr and Jellyfin on the bridge.

## Installation and First-Run Flow

Install raises two critical tasks, **Set Admin Password** and **Media Storage**, and Unmanic does not start until both have run. The first start then behaves as upstream's: one default library at `/library`, which is unmounted and empty, no worker groups and no plugins.

Two consequences generate support questions:

- **Nothing processes until a worker group exists.** Upstream ships none; tasks sit in the pending list until the user adds workers under **Settings → Workers**.
- **A connected notify plugin does nothing until it is in a library's plugin flow.** The package installs and configures it but never edits a library.

## Actions

Five user-facing actions. None is hidden.

### Set Admin Password

- **When:** first setup, or to rotate the Web UI password.
- **Changes:** `adminPassword` in `store.json`, and through it the interface's auth gate.
- **Cost:** seconds; Unmanic does not restart. The old password is rejected as soon as the gate is rebound.
- **Repeat safety:** each run replaces the password.
- **Output:** username `admin` and the new password.

### Media Storage

- **When:** to choose or change which file managers Unmanic can reach.
- **Changes:** `mediaSources`, the mount set and the dependency set.
- **Cost:** a restart, which abandons any file being processed.
- **Repeat safety:** idempotent; the form is pre-filled.
- **Next:** point a library at a folder under the new mount in **Settings → Library**. A library left pointing at a deselected mount finds nothing.

### Connect / Disconnect Sonarr, Radarr, Jellyfin

- **When:** to have that service rescan after Unmanic replaces a file, or to stop.
- **Changes:** the service's state in `store.json`; on connect, the notify plugin and its URL and key; on disconnect, removes the plugin, which takes its settings and its library-flow entries with it.
- **Cost:** a restart, then a plugin download from the Unmanic repository on connect.
- **Repeat safety:** each run toggles.
- **Next:** after connecting, add the plugin to each library's flow. The **Integrations** health check reports the result.

## Tasks

Two critical tasks, both raised at install and both blocking startup.

| Task               | Severity   | Raised when                 | Cleared when                        |
| ------------------ | ---------- | --------------------------- | ----------------------------------- |
| Set Admin Password | `critical` | `adminPassword` is unset    | **Set Admin Password** runs         |
| Media Storage      | `critical` | No file manager is selected | **Media Storage** saves a selection |

Neither returns once cleared, since neither action can unset its value.

## Health Checks

The web check is always present; the integrations check exists only while a service is connected or being disconnected.

| Check                         | Probes                                                               | Grace period |
| ----------------------------- | -------------------------------------------------------------------- | ------------ |
| `primary` "Web Interface"     | `GET /unmanic/api/v2/version/read` on `127.0.0.1:8888`               | SDK default  |
| `integrations` "Integrations" | Installs and configures connected plugins, removes disconnected ones | —            |

`integrations` messages and what they mean:

- **Connected to …** — every connected plugin is installed with current settings.
- **… is not installed** — a connected service was uninstalled. Reinstall it, or run its connect action to disconnect.
- **… has not shared its API key yet** — the service has not written `api-key` to its `public` volume. Start it once; for Jellyfin, update it to a release that publishes one.
- **Could not set up the … plugin: …** — Unmanic's API refused or the plugin download failed, most often with no internet access. The check retries a minute after a failure.

## Backups and Restore

`startos` and `main` are copied wholesale; `.unmanic/logs` is excluded, and `cache` is not backed up.

- **Included:** the admin password, media selection and connection states; Unmanic's database, settings, libraries, worker groups, task history, installed plugins and their settings.
- **Not included:** the encode cache, which holds only in-progress files, and the media, which belongs to the file manager and its own backup.
- **Restore:** complete. The restored instance keeps its password, libraries and plugins; the selected file managers and connected services must be installed for their mounts to appear.

## Limitations and Differences

1. **A login is required.** StartOS enforces HTTP Basic auth on every address; upstream has none.
2. **Media is reachable only through FileBrowser Quantum or NextExplorer**, at `/mnt/filebrowser` and `/mnt/nextexplorer`. Unmanic's default `/library` is empty.
3. **Connecting a service needs internet access**, since its notify plugin downloads from the Unmanic repository.
4. **The package never edits libraries.** Notify plugins must be added to each library's flow by hand.
5. **Free Unmanic is limited to two libraries**, as upstream; a supporter account raises it.
6. **Hardware encoding needs a GPU the server exposes.** The `generic` variant covers VAAPI/QSV through `/dev/dri`; NVENC needs the `nvidia` variant, which StartOS offers only on a server with an NVIDIA GPU.
7. **No riscv64 build.**

---

## Quick Reference for AI Consumers

```yaml
package_id: unmanic
image: josh5/unmanic
architectures:
  - x86_64
  - aarch64
variants:
  - generic
  - nvidia
subcontainers:
  - unmanic-sub
volumes:
  main: /config
  cache: /tmp/unmanic
  startos: host side (store.json)
file_models:
  - store.json
startos_managed_env_vars:
  - PUID
  - PGID
  - TZ
dependencies: # all optional, kind "exists"
  - filebrowser # /mnt/filebrowser, read-write
  - nextexplorer # /mnt/nextexplorer, read-write
  - sonarr # public at /mnt/sonarr, read-only
  - radarr # public at /mnt/radarr, read-only
  - jellyfin # public at /mnt/jellyfin, read-only
interfaces:
  ui: { type: ui, port: 8888 }
actions:
  - set-admin-password
  - media-storage
  - connect-sonarr
  - connect-radarr
  - connect-jellyfin
tasks:
  - { action: set-admin-password, severity: critical }
  - { action: media-storage, severity: critical }
health_checks:
  - primary
  - integrations
```
