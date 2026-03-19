/**
 * scripts/publish.js
 *
 * Bumps the version, applies config, commits, creates a git tag, and pushes
 * to trigger the GitHub Actions release workflow.
 *
 * Usage:
 *   npm run publish -- patch        # 0.0.0 -> 0.0.1
 *   npm run publish -- minor        # 0.0.1 -> 0.1.0
 *   npm run publish -- major        # 0.1.0 -> 1.0.0
 *   npm run publish -- 2.1.0        # set exact version
 */

import { readFileSync, writeFileSync } from "fs";
import { execSync } from "child_process";
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

function run(cmd) {
  console.log(`$ ${cmd}`);
  execSync(cmd, { cwd: ROOT, stdio: "inherit" });
}

function bumpVersion(current, type) {
  const parts = current.split(".").map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    console.error(`Invalid current version: ${current}`);
    process.exit(1);
  }

  let [major, minor, patch] = parts;

  switch (type) {
    case "major":
      major++;
      minor = 0;
      patch = 0;
      break;
    case "minor":
      minor++;
      patch = 0;
      break;
    case "patch":
      patch++;
      break;
    default:
      console.error(
        `Unknown bump type: ${type}. Use major, minor, patch, or an exact semver.`
      );
      process.exit(1);
  }

  return `${major}.${minor}.${patch}`;
}

function isExactVersion(str) {
  return /^\d+\.\d+\.\d+$/.test(str);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const arg = process.argv[2];

  if (!arg) {
    console.error("Usage: npm run publish -- <patch|minor|major|x.y.z>");
    process.exit(1);
  }

  // Read current config
  const config = readJSON("template.config.json");
  const currentVersion = config.version;

  // Determine new version
  let newVersion;
  if (isExactVersion(arg)) {
    newVersion = arg;
  } else {
    newVersion = bumpVersion(currentVersion, arg);
  }

  console.log(`Version: ${currentVersion} -> ${newVersion}`);

  // Update template.config.json
  config.version = newVersion;
  writeJSON("template.config.json", config);
  console.log("[ok] template.config.json version updated.");

  // Run config script to propagate to all files
  console.log("\nApplying configuration...");
  execSync("node scripts/config.js", { cwd: ROOT, stdio: "inherit" });

  // Check for uncommitted changes and stage everything
  const status = execSync("git status --porcelain", {
    cwd: ROOT,
    encoding: "utf-8",
  }).trim();

  if (status) {
    run("git add -A");
    run(`git commit -m "release: v${newVersion}"`);
  } else {
    console.log("No changes to commit.");
  }

  // Create annotated tag
  const tag = `v${newVersion}`;
  run(`git tag -a ${tag} -m "Release ${tag}"`);
  console.log(`\n[ok] Created tag: ${tag}`);

  // Push commit and tag
  run("git push");
  run(`git push origin ${tag}`);

  console.log(`\n=== Published ${tag} ===`);
  console.log(
    "The GitHub Actions workflow will now build and create the release."
  );
}

main();
