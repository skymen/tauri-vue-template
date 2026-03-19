# Tauri + Vue 3 Template

A reusable template for building cross-platform desktop apps with Tauri v1 and Vue 3. Comes with scaffolding scripts so you never have to manually hunt down placeholder values across files again.

## Tech Stack

- [Tauri v1](https://tauri.app/) — desktop app framework (Rust backend)
- [Vue 3](https://vuejs.org/) — frontend framework (Composition API, `<script setup>`)
- [Vite](https://vitejs.dev/) — build tool
- [Pinia](https://pinia.vuejs.org/) — state management
- [Vue Router](https://router.vuejs.org/) — routing

## Prerequisites

Install these before you start:

| Tool | Install |
|---|---|
| **Node.js >= 20** | https://nodejs.org/ |
| **Rust** | https://rustup.rs/ |
| **Tauri v1 system deps** | https://tauri.app/v1/guides/getting-started/prerequisites |
| **GitHub CLI** (optional, for `npm run init` auto-push) | https://cli.github.com/ |

On **macOS**, Xcode Command Line Tools are also required (`xcode-select --install`).

On **Ubuntu/Debian**, the system dependencies are:

```sh
sudo apt-get install -y libgtk-3-dev libwebkit2gtk-4.0-dev libappindicator3-dev librsvg2-dev patchelf
```

## Quick Start

```sh
# 1. Clone the template
git clone https://github.com/skymen/tauri-vue-template.git my-app
cd my-app

# 2. Install dependencies
npm install

# 3. Run the interactive setup
npm run init
```

`npm run init` walks you through a form that asks for your project name, description, GitHub repo, etc. It then:

1. Writes your answers to `template.config.json`
2. Applies the config to all project files automatically
3. Offers to generate a Tauri updater keypair
4. Initializes a fresh git repo with an initial commit
5. Offers to create and push to a GitHub repo (requires `gh` CLI)

After init, start developing:

```sh
npm run tauri dev
```

## Scripts

| Command | What it does |
|---|---|
| `npm run init` | Interactive project setup (run once after cloning) |
| `npm run config` | Apply `template.config.json` to all project files |
| `npm run icons` | Generate all app icons from your source SVG/PNG |
| `npm run publish -- <patch\|minor\|major\|x.y.z>` | Bump version, commit, tag, push (triggers CI release) |
| `npm run dev` | Start Vite dev server (auto-applies config first) |
| `npm run build` | Production build (auto-applies config first) |
| `npm run tauri dev` | Start Tauri + Vite in development mode |
| `npm run tauri build` | Build the final desktop app |

## Project Structure

```
├── template.config.json          # YOUR config — single source of truth
├── assets/                       # Place your source icon.svg / icon.png here
├── scripts/
│   ├── init.js                   # Interactive project setup
│   ├── config.js                 # Applies config to all project files
│   ├── generate-icons.js         # SVG/PNG → all Tauri icon sizes
│   └── publish.js                # Version bump + tag + push
├── src/                          # Vue frontend
│   ├── main.js                   # App entry point
│   ├── App.vue                   # Root component (router-view + transitions)
│   ├── plugins/router.js         # Vue Router setup
│   ├── store/store.js            # Pinia store (empty skeleton)
│   └── views/Home.vue            # Home view (empty — start here)
├── src-tauri/                    # Tauri / Rust backend
│   ├── tauri.conf.json           # Tauri config (managed by scripts)
│   ├── Cargo.toml                # Rust dependencies (managed by scripts)
│   ├── src/main.rs               # Rust entry point with sample command
│   └── icons/                    # Generated icons (managed by scripts)
├── .github/workflows/
│   └── tauri-release.yml         # CI: builds + releases on version tags
├── package.json
├── vite.config.js
└── index.html
```

## How the Config System Works

`template.config.json` is the single source of truth for your project identity. When you run `npm run config` (or it runs automatically via `npm run dev` / `npm run build`), it patches these files:

| File | Fields updated |
|---|---|
| `package.json` | `name`, `version`, `description`, `author`, `license` |
| `src-tauri/Cargo.toml` | `name`, `version`, `description`, `authors`, `license`, `repository` |
| `src-tauri/tauri.conf.json` | `productName`, `version`, `identifier`, window title/size, updater endpoint + pubkey |
| `index.html` | `<title>` tag |
| `.github/workflows/tauri-release.yml` | Cleans any stale hardcoded repo URLs |

During `npm run dev`, Vite watches `template.config.json` for changes and re-applies the config automatically.

You should **only edit project identity in `template.config.json`** — the other files are overwritten by the config script.

### Config File Reference

```jsonc
{
  "name": "my-app",               // package name (kebab-case)
  "productName": "My App",        // display name shown in OS
  "version": "0.0.0",             // semver — managed by npm run publish
  "identifier": "com.you.myapp",  // bundle identifier (reverse-DNS)
  "description": "A Tauri App",
  "author": "Your Name",
  "license": "MIT",
  "github": {
    "owner": "your-username",     // GitHub username or org
    "repo": "my-app"              // GitHub repo name
  },
  "window": {
    "title": "My App",            // main window title
    "width": 800,
    "height": 600
  },
  "updater": {
    "active": false,              // set to true after generating keys
    "pubkey": ""                  // public key from tauri signer
  },
  "icons": {
    "svg": "assets/icon.svg",     // preferred source (rendered to PNG)
    "png": "assets/icon.png"      // fallback (should be >= 1024x1024)
  }
}
```

## Icons

1. Place your source icon in the `assets/` directory:
   - **`icon.svg`** (preferred) — will be rendered to 1024x1024 PNG, then to all sizes
   - **`icon.png`** (fallback) — should be at least 1024x1024 pixels
2. Run:
   ```sh
   npm run icons
   ```
   This generates all 16 icon files in `src-tauri/icons/` including `.ico` (Windows) and `.icns` (macOS).

If you want to change the source file paths, edit the `icons` section in `template.config.json`.

## Publishing a Release

Releases are triggered by pushing a version tag. The `publish` script handles everything:

```sh
npm run publish -- patch          # 0.0.0 → 0.0.1
npm run publish -- minor          # 0.0.1 → 0.1.0
npm run publish -- major          # 0.1.0 → 1.0.0
npm run publish -- 2.5.0          # set an exact version
```

This will:
1. Bump the version in `template.config.json`
2. Propagate it to `package.json`, `Cargo.toml`, and `tauri.conf.json`
3. Commit the changes
4. Create an annotated git tag (`v0.0.1`, etc.)
5. Push the commit and tag to GitHub

The GitHub Actions workflow then builds for macOS, Linux, and Windows, creates a GitHub Release with the installers attached, and updates the `update` branch with `latest.json` for the auto-updater.

## Manual Setup Steps

Most setup is handled by `npm run init`, but a few things still need to be done by hand:

### 1. Add the updater private key to GitHub (if using auto-updater)

During `npm run init`, if you chose to generate an updater keypair, the script will:
- Save the public key to `template.config.json` automatically
- Print the private key to the console and copy it to your clipboard
- Offer to open your GitHub repo's secrets page in your browser

All you need to do is paste the key into a new secret named **`TAURI_PRIVATE_KEY`**.

If you skipped this during init or need to redo it:

```sh
npx tauri signer generate -w .tauri-updater.key
```

Then:
- Copy the **public key** from the output into `template.config.json` under `updater.pubkey`
- Set `updater.active` to `true`
- Run `npm run config` to apply the changes
- Add the **private key** (contents of `.tauri-updater.key`) as a GitHub repository secret named `TAURI_PRIVATE_KEY` at:

  `https://github.com/<owner>/<repo>/settings/secrets/actions/new`

The private key file is gitignored and should never be committed.

### 2. Your app icon

The template ships with Tauri's default placeholder icons. Replace them:

1. Create your icon as an SVG or large PNG (>= 1024x1024)
2. Save it to `assets/icon.svg` or `assets/icon.png`
3. Run `npm run icons`

### 3. Build your app

The template gives you an empty canvas:
- `src/views/Home.vue` — empty, this is where your app starts
- `src/store/store.js` — empty Pinia store skeleton
- `src-tauri/src/main.rs` — has a sample `greet` Tauri command you can replace

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/)
- [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) — Vue language support
- [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) — Tauri integration
- [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer) — Rust language support
