/**
 * scripts/config.js
 *
 * Reads template.config.json and patches all project files to match.
 * Safe to run repeatedly — idempotent.
 *
 * Patched files:
 *   - package.json
 *   - src-tauri/Cargo.toml
 *   - src-tauri/tauri.conf.json
 *   - .github/workflows/tauri-release.yml
 *   - index.html
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJSON(rel) {
  return JSON.parse(readFileSync(resolve(ROOT, rel), "utf-8"));
}

function writeJSON(rel, data) {
  writeFileSync(resolve(ROOT, rel), JSON.stringify(data, null, 2) + "\n");
}

function readText(rel) {
  return readFileSync(resolve(ROOT, rel), "utf-8");
}

function writeText(rel, content) {
  writeFileSync(resolve(ROOT, rel), content);
}

function patchToml(rel, patches) {
  let content = readText(rel);
  for (const [key, value] of Object.entries(patches)) {
    // Match `key = "..."` or `key = ["..."]` lines
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (Array.isArray(value)) {
      const arrayStr = `[${value.map((v) => `"${v}"`).join(", ")}]`;
      content = content.replace(
        new RegExp(`^(${escaped}\\s*=\\s*).*$`, "m"),
        `$1${arrayStr}`
      );
    } else {
      content = content.replace(
        new RegExp(`^(${escaped}\\s*=\\s*).*$`, "m"),
        `$1"${value}"`
      );
    }
  }
  writeText(rel, content);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export function runConfig() {
  const configPath = resolve(ROOT, "template.config.json");
  if (!existsSync(configPath)) {
    console.error("template.config.json not found. Run `npm run init` first.");
    process.exit(1);
  }

  const cfg = readJSON("template.config.json");

  console.log(`Applying config for "${cfg.productName}" v${cfg.version}...`);

  // -- package.json ---------------------------------------------------------
  const pkg = readJSON("package.json");
  // Build a new object with desired key order
  const orderedPkg = {
    name: cfg.name,
    private: pkg.private,
    version: cfg.version,
    type: pkg.type,
    ...(cfg.description ? { description: cfg.description } : {}),
    ...(cfg.author ? { author: cfg.author } : {}),
    ...(cfg.license ? { license: cfg.license } : {}),
    scripts: pkg.scripts,
    dependencies: pkg.dependencies,
    devDependencies: pkg.devDependencies,
  };
  writeJSON("package.json", orderedPkg);
  console.log("  [ok] package.json");

  // -- src-tauri/Cargo.toml ------------------------------------------------
  const cargoPatches = {
    name: cfg.name,
    version: cfg.version,
    description: cfg.description || "A Tauri App",
    authors: [cfg.author || "you"],
    license: cfg.license || "",
  };
  if (cfg.github?.owner && cfg.github?.repo) {
    cargoPatches.repository = `https://github.com/${cfg.github.owner}/${cfg.github.repo}`;
  }
  patchToml("src-tauri/Cargo.toml", cargoPatches);
  console.log("  [ok] src-tauri/Cargo.toml");

  // -- src-tauri/tauri.conf.json (Tauri v2 format) -------------------------
  const tauri = readJSON("src-tauri/tauri.conf.json");

  // Top-level fields
  tauri.productName = cfg.productName || cfg.name;
  tauri.version = cfg.version;
  tauri.identifier = cfg.identifier || "com.tauri.dev";

  // Window (under app.windows[])
  if (cfg.window && tauri.app?.windows?.[0]) {
    const win = tauri.app.windows[0];
    if (cfg.window.title) win.title = cfg.window.title;
    if (cfg.window.width) win.width = cfg.window.width;
    if (cfg.window.height) win.height = cfg.window.height;
  }

  // Updater plugin (under plugins.updater)
  if (!tauri.plugins) tauri.plugins = {};
  if (!tauri.plugins.updater) tauri.plugins.updater = {};

  if (cfg.updater?.pubkey) {
    tauri.plugins.updater.pubkey = cfg.updater.pubkey;
  }
  if (cfg.github?.owner && cfg.github?.repo) {
    tauri.plugins.updater.endpoints = [
      `https://raw.githubusercontent.com/${cfg.github.owner}/${cfg.github.repo}/update/latest.json`,
    ];
  }

  writeJSON("src-tauri/tauri.conf.json", tauri);
  console.log("  [ok] src-tauri/tauri.conf.json");

  // -- .github/workflows/tauri-release.yml ---------------------------------
  const workflowPath = ".github/workflows/tauri-release.yml";
  if (existsSync(resolve(ROOT, workflowPath))) {
    // The workflow uses ${{ github.repository }} so it's already portable.
    // But we still ensure no stale hardcoded repo references remain.
    let wf = readText(workflowPath);

    // Replace any leftover hardcoded github repo URLs in curl commands
    // (e.g., skymen/construct-crawler or old owner/repo)
    wf = wf.replace(
      /https:\/\/github\.com\/[^/]+\/[^/]+\/releases\/download/g,
      `https://github.com/\${{ github.repository }}/releases/download`
    );

    writeText(workflowPath, wf);
    console.log("  [ok] .github/workflows/tauri-release.yml");
  }

  // -- index.html -----------------------------------------------------------
  let html = readText("index.html");
  const title = cfg.window?.title || cfg.productName || cfg.name;
  html = html.replace(/<title>.*<\/title>/, `<title>${title}</title>`);
  writeText("index.html", html);
  console.log("  [ok] index.html");

  console.log("Config applied successfully.");
}

// Run directly
runConfig();
