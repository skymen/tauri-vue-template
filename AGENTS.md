## Golden Rule

**`template.config.json` is the single source of truth** for project identity (name, version, identifier, author, window settings, updater config, GitHub coordinates). Never edit these fields directly in `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`, or `index.html`. Edit `template.config.json` and run `node scripts/config.js` (or it runs automatically on `npm run dev` / `npm run build`).

## Tauri v2 Specifics

- Import from `@tauri-apps/api/core` (not `@tauri-apps/api`).
- Shell: `@tauri-apps/plugin-shell`. Updater: `@tauri-apps/plugin-updater`.
- Rust plugins are registered in `src-tauri/src/lib.rs` via `.plugin()`.
- Rust commands are registered via `.invoke_handler(tauri::generate_handler![...])` in `lib.rs`.
- Permissions go in `src-tauri/capabilities/`. The default capability grants `core:default`, `shell:allow-open`, and `updater:default`.
- The updater plugin is desktop-only (gated behind `#[cfg(desktop)]`).
- Environment variable for CI signing: `TAURI_SIGNING_PRIVATE_KEY` (not the v1 name).

## Adding Features

- **New page**: Create a `.vue` file in `src/views/`, add a route in `src/plugins/router.js`.
- **New Tauri command**: Define a `#[tauri::command]` fn in `lib.rs`, add it to `generate_handler![]`.
- **New capability/permission**: Add to `src-tauri/capabilities/default.json` or create a new capability file.
- **New state**: Add to the Pinia store in `src/store/store.js`.
- **New Rust plugin**: Add the crate to `Cargo.toml`, register with `.plugin()` in `lib.rs`, add its JS package to `package.json`.

## Scripts

| Command                                           | Purpose                                      |
| ------------------------------------------------- | -------------------------------------------- |
| `npm run dev`                                     | Vite dev server (auto-applies config first)  |
| `npm run build`                                   | Production build (auto-applies config first) |
| `npm run tauri dev`                               | Full Tauri + Vite dev mode                   |
| `npm run tauri build`                             | Build desktop app                            |
| `npm run config`                                  | Apply template.config.json to all files      |
| `npm run icons`                                   | Generate icons from assets/ source           |
| `npm run publish -- <patch\|minor\|major\|x.y.z>` | Bump, tag, push                              |
