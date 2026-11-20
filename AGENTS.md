# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

## This repo

- **Build a variant with `make generic-x86`, `make nvidia-arm` and so on**; bare `make x86` packs the generic variant under its unsuffixed name.
- **Keep `hardwareAcceleration` identical across variants.** The registry rejects a second variant whose metadata differs; only `hardwareRequirements` and `nvidiaContainer` may vary.
- **Write Unmanic's own state through its API, never its files.** Libraries and worker groups live in its SQLite database, and plugin settings are rewritten by the running app.
- **Adding an integration means editing five places in step:** `integrations` in `startos/utils.ts`, `mountPublic` in `startos/main.ts`, a `sdk.Dependency.optional` entry in `startos/dependencies.ts`, an export in `startos/actions/connect.ts`, and a field in `startos/fileModels/store.json.ts`.
