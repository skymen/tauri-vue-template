# Installation

Download the app from the releases page and run it.

https://github.com/skymen/construct-crawler/releases/latest

Note that opening a project as a c3p file does not apply the changes to the c3p.
To actually apply the changes, you need to save the project as a project folder before opening it.

# Development prerequisites

## Github Action

You need to enable the github actions write authorization for the repository. This is needed to publish the releases and to create a branch for the updater.

## Updater

Generate a publication key, add the private key to the repository secrets as `TAURI_PRIVATE_KEY` and add the public key to tauri.config.json as `updater/pubkey`.
Also, change the endpoint to the correct name/repo in tauri.config.json.

## App name

I have no idea how to properly change the name of the app when cloning it from this repo to a new one. Good luck!!!

# Tech stack

This template uses the following technologies:

- [Vue 3](https://v3.vuejs.org/)
- [Vite](https://vitejs.dev/)
- [Tauri](https://tauri.studio/)
- [Pinia](https://pinia.esm.dev/)
- [Vue Router](https://next.router.vuejs.org/)

It also includes the following features:

- Auto publish release when committing to the `main` branch
- Automatically support tauri's auto updater by generating and uploading the latest.json file to a separate branch
- Template comes preinstalled and preconfigured with Pinia and Vue Router

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
