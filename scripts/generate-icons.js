/**
 * scripts/generate-icons.js
 *
 * Generates all Tauri icon assets from a source SVG or PNG file.
 * Reads the icon source path from template.config.json.
 *
 * Usage: npm run icons
 *
 * Requires: sharp (npm install -D sharp)
 *
 * If an SVG source is provided, it is rendered to a 1024x1024 master PNG first.
 * Then all required sizes are generated, plus .ico and .icns via tauri icon.
 */

import { readFileSync, existsSync, mkdirSync } from "fs";
import { execSync } from "child_process";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

async function main() {
  // Dynamic import so the script fails gracefully if sharp isn't installed
  let sharp;
  try {
    sharp = (await import("sharp")).default;
  } catch {
    console.error("sharp is not installed. Run: npm install -D sharp");
    process.exit(1);
  }

  // Read config
  const configPath = resolve(ROOT, "template.config.json");
  if (!existsSync(configPath)) {
    console.error("template.config.json not found. Run `npm run init` first.");
    process.exit(1);
  }
  const config = JSON.parse(readFileSync(configPath, "utf-8"));

  // Determine icon source
  const svgPath = config.icons?.svg
    ? resolve(ROOT, config.icons.svg)
    : null;
  const pngPath = config.icons?.png
    ? resolve(ROOT, config.icons.png)
    : null;

  let sourcePath = null;
  if (svgPath && existsSync(svgPath)) {
    sourcePath = svgPath;
  } else if (pngPath && existsSync(pngPath)) {
    sourcePath = pngPath;
  } else {
    console.error("No icon source found.");
    console.error(`Looked for:`);
    if (svgPath) console.error(`  SVG: ${svgPath}`);
    if (pngPath) console.error(`  PNG: ${pngPath}`);
    console.error(
      "\nPlace an icon.svg or icon.png in the assets/ directory,\nor update the paths in template.config.json."
    );
    process.exit(1);
  }

  console.log(`Icon source: ${sourcePath}`);

  // Ensure icons output directory exists
  const iconsDir = resolve(ROOT, "src-tauri", "icons");
  mkdirSync(iconsDir, { recursive: true });

  // Generate a 1024x1024 master PNG (required by tauri icon)
  const masterPng = resolve(iconsDir, "icon.png");

  if (sourcePath.endsWith(".svg")) {
    console.log("Rendering SVG to 1024x1024 PNG...");
    await sharp(sourcePath)
      .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(masterPng);
  } else {
    console.log("Resizing PNG to 1024x1024...");
    await sharp(sourcePath)
      .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(masterPng);
  }

  console.log(`  [ok] ${masterPng}`);

  // Use `tauri icon` to generate all platform-specific icons from the master PNG.
  // This produces: 32x32.png, 128x128.png, 128x128@2x.png, icon.ico, icon.icns,
  // and all the Square*.png / StoreLogo.png files.
  console.log("\nRunning tauri icon to generate all sizes...");
  try {
    execSync(`npx tauri icon "${masterPng}"`, {
      cwd: ROOT,
      stdio: "inherit",
    });
    console.log("\n[ok] All icons generated in src-tauri/icons/");
  } catch (e) {
    console.error("\ntauri icon failed. Falling back to manual generation...");
    await manualGenerate(sharp, masterPng, iconsDir);
  }
}

/**
 * Fallback: manually generate icon sizes if `tauri icon` is unavailable.
 */
async function manualGenerate(sharp, masterPng, iconsDir) {
  const sizes = [
    { name: "32x32.png", size: 32 },
    { name: "128x128.png", size: 128 },
    { name: "128x128@2x.png", size: 256 },
    { name: "Square30x30Logo.png", size: 30 },
    { name: "Square44x44Logo.png", size: 44 },
    { name: "Square71x71Logo.png", size: 71 },
    { name: "Square89x89Logo.png", size: 89 },
    { name: "Square107x107Logo.png", size: 107 },
    { name: "Square142x142Logo.png", size: 142 },
    { name: "Square150x150Logo.png", size: 150 },
    { name: "Square284x284Logo.png", size: 284 },
    { name: "Square310x310Logo.png", size: 310 },
    { name: "StoreLogo.png", size: 50 },
  ];

  for (const { name, size } of sizes) {
    const outPath = resolve(iconsDir, name);
    await sharp(masterPng)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(outPath);
    console.log(`  [ok] ${name} (${size}x${size})`);
  }

  console.log(
    "\nNote: .ico and .icns files were NOT generated (tauri icon unavailable)."
  );
  console.log(
    "Install @tauri-apps/cli and re-run, or use an online converter."
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
