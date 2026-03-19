/**
 * scripts/init.js
 *
 * Interactive project initializer. Guides the user through filling
 * template.config.json, generates the Tauri updater keypair,
 * initializes git, and optionally creates + pushes to a GitHub repo.
 *
 * Usage: npm run init
 */

import { createInterface } from "readline";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { execSync, spawnSync } from "child_process";
import { resolve, dirname, basename } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question, defaultValue = "") {
  const suffix = defaultValue ? ` (${defaultValue})` : "";
  return new Promise((res) => {
    rl.question(`${question}${suffix}: `, (answer) => {
      res(answer.trim() || defaultValue);
    });
  });
}

function askYN(question, defaultYes = true) {
  const hint = defaultYes ? "Y/n" : "y/N";
  return new Promise((res) => {
    rl.question(`${question} [${hint}]: `, (answer) => {
      const a = answer.trim().toLowerCase();
      if (a === "") return res(defaultYes);
      res(a === "y" || a === "yes");
    });
  });
}

function run(cmd, opts = {}) {
  return execSync(cmd, { cwd: ROOT, stdio: "inherit", ...opts });
}

function runCapture(cmd) {
  return execSync(cmd, { cwd: ROOT, encoding: "utf-8" }).trim();
}

function commandExists(cmd) {
  const result = spawnSync("which", [cmd], { encoding: "utf-8" });
  return result.status === 0;
}

function copyToClipboard(text) {
  try {
    const platform = process.platform;
    if (platform === "darwin") {
      execSync("pbcopy", { input: text });
    } else if (platform === "linux") {
      // Try xclip first, then xsel
      try {
        execSync("xclip -selection clipboard", { input: text });
      } catch {
        execSync("xsel --clipboard --input", { input: text });
      }
    } else if (platform === "win32") {
      execSync("clip", { input: text });
    }
    return true;
  } catch {
    return false;
  }
}

function openUrl(url) {
  try {
    const platform = process.platform;
    if (platform === "darwin") {
      execSync(`open "${url}"`);
    } else if (platform === "linux") {
      execSync(`xdg-open "${url}"`);
    } else if (platform === "win32") {
      execSync(`start "" "${url}"`);
    }
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Steps
// ---------------------------------------------------------------------------

async function fillConfig() {
  console.log("\n--- Project Configuration ---\n");

  const dirName = basename(ROOT);

  const name = await ask("Package name (kebab-case)", dirName);
  const productName = await ask("Product name (display name)", name);
  const description = await ask("Description", "A Tauri App");
  const author = await ask("Author");
  const license = await ask("License", "MIT");
  const identifier = await ask(
    "Bundle identifier (reverse-DNS)",
    `com.${author || "example"}.${name}`
  );

  console.log("\n--- GitHub ---\n");
  const ghOwner = await ask("GitHub owner (username or org)", author);
  const ghRepo = await ask("GitHub repo name", name);

  console.log("\n--- Window ---\n");
  const winTitle = await ask("Window title", productName);
  const winWidth = parseInt(await ask("Window width", "800"), 10);
  const winHeight = parseInt(await ask("Window height", "600"), 10);

  const config = {
    name,
    productName,
    version: "0.0.0",
    identifier,
    description,
    author,
    license,
    github: {
      owner: ghOwner,
      repo: ghRepo,
    },
    window: {
      title: winTitle,
      width: winWidth,
      height: winHeight,
    },
    updater: {
      active: false,
      pubkey: "",
    },
    icons: {
      svg: "assets/icon.svg",
      png: "assets/icon.png",
    },
  };

  writeFileSync(
    resolve(ROOT, "template.config.json"),
    JSON.stringify(config, null, 2) + "\n"
  );
  console.log("\n[ok] template.config.json written.");

  return config;
}

async function generateUpdaterKey(config) {
  const generate = await askYN("\nGenerate Tauri updater keypair?");
  if (!generate) return;

  const keyPath = resolve(ROOT, ".tauri-updater.key");
  const pubPath = resolve(ROOT, ".tauri-updater.key.pub");

  if (existsSync(keyPath)) {
    const overwrite = await askYN(
      "Updater key already exists. Overwrite?",
      false
    );
    if (!overwrite) {
      // Read existing pubkey
      if (existsSync(pubPath)) {
        config.updater.pubkey = readFileSync(pubPath, "utf-8").trim();
        config.updater.active = true;
      }
      return;
    }
  }

  console.log("Generating updater keypair...");
  console.log(
    "(You will be prompted for an optional password. Press Enter to skip.)\n"
  );

  try {
    // tauri signer generate outputs the private key to the file and pubkey to stdout
    const result = execSync(
      `npx tauri signer generate -w "${keyPath}"`,
      { cwd: ROOT, encoding: "utf-8", stdio: ["inherit", "pipe", "inherit"] }
    );

    // Extract pubkey from output
    const pubkeyMatch = result.match(/^(dW[A-Za-z0-9+/=]+)$/m);
    if (pubkeyMatch) {
      config.updater.pubkey = pubkeyMatch[1];
      config.updater.active = true;
      writeFileSync(pubPath, pubkeyMatch[1] + "\n");
      console.log(`\n[ok] Private key: ${keyPath}`);
      console.log(`[ok] Public key:  ${pubPath}`);

      // Read the private key and help the user add it to GitHub
      const privateKey = readFileSync(keyPath, "utf-8").trim();

      console.log(
        "\nYou need to add the private key as a TAURI_SIGNING_PRIVATE_KEY secret in your GitHub repo."
      );
      console.log("Private key:\n");
      console.log(privateKey);
      console.log();

      // Copy to clipboard
      if (copyToClipboard(privateKey)) {
        console.log("[ok] Private key copied to clipboard.");
      } else {
        console.log("(Could not copy to clipboard — copy the key above manually.)");
      }

      // Offer to open the GitHub secrets page
      if (config.github?.owner && config.github?.repo) {
        const secretsUrl = `https://github.com/${config.github.owner}/${config.github.repo}/settings/secrets/actions/new`;
        const openPage = await askYN(
          `\nOpen GitHub secrets page in your browser?`
        );
        if (openPage) {
          if (!openUrl(secretsUrl)) {
            console.log("Could not open browser. Go to:");
            console.log(`  ${secretsUrl}`);
          }
        } else {
          console.log(`\nAdd the secret manually at:\n  ${secretsUrl}`);
        }
        console.log('\nName the secret: TAURI_SIGNING_PRIVATE_KEY');
      } else {
        console.log(
          "\nNo GitHub owner/repo configured — add the secret manually later at:"
        );
        console.log(
          "  https://github.com/<owner>/<repo>/settings/secrets/actions/new"
        );
        console.log("  Name: TAURI_SIGNING_PRIVATE_KEY");
      }
    } else {
      console.log("Could not extract pubkey from output. You can set it manually in template.config.json.");
      console.log("Raw output:", result);
    }
  } catch (e) {
    console.error("Failed to generate updater key. You can do it manually:");
    console.error(`  npx tauri signer generate -w "${keyPath}"`);
  }

  // Update config file with pubkey
  writeFileSync(
    resolve(ROOT, "template.config.json"),
    JSON.stringify(config, null, 2) + "\n"
  );
}

async function initGit() {
  const isGitRepo = existsSync(resolve(ROOT, ".git"));

  if (isGitRepo) {
    const reinit = await askYN(
      "\nGit repo already exists. Re-initialize (clears history)?",
      false
    );
    if (!reinit) return;
    execSync("rm -rf .git", { cwd: ROOT });
  }

  console.log("\nInitializing git repository...");
  run("git init");
  run("git add .");
  run('git commit -m "Initial commit from tauri-vue-template"');
  console.log("[ok] Git repository initialized with initial commit.");
}

async function pushToGitHub(config) {
  if (!config.github?.owner || !config.github?.repo) {
    console.log("\nSkipping GitHub push (no owner/repo configured).");
    return;
  }

  const push = await askYN(
    `\nCreate and push to GitHub repo ${config.github.owner}/${config.github.repo}?`
  );
  if (!push) return;

  if (!commandExists("gh")) {
    console.log("GitHub CLI (gh) not found. Install it: https://cli.github.com/");
    console.log("Then run manually:");
    console.log(
      `  gh repo create ${config.github.owner}/${config.github.repo} --private --source=. --push`
    );
    return;
  }

  const visibility = await ask("Visibility (public/private)", "private");

  try {
    run(
      `gh repo create ${config.github.owner}/${config.github.repo} --${visibility} --source=. --push`
    );
    console.log(
      `[ok] Pushed to https://github.com/${config.github.owner}/${config.github.repo}`
    );
  } catch (e) {
    console.error("Failed to create/push repo. You can do it manually:");
    console.error(
      `  gh repo create ${config.github.owner}/${config.github.repo} --${visibility} --source=. --push`
    );
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log("=== Tauri Vue Template — Project Init ===");

  const config = await fillConfig();

  // Run config script to apply changes
  console.log("\nApplying configuration to project files...");
  const { runConfig } = await import("./config.js");
  runConfig();

  await generateUpdaterKey(config);
  await initGit();
  await pushToGitHub(config);

  rl.close();
  console.log("\n=== Init complete! ===");
  console.log("Next steps:");
  console.log("  npm run dev      — start development");
  console.log("  npm run icons    — generate icons from assets/icon.svg or .png");
  console.log("  npm run publish  — bump version, tag, and push to trigger release");
}

main().catch((err) => {
  console.error(err);
  rl.close();
  process.exit(1);
});
