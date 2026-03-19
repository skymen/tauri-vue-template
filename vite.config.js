import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";
import { execSync } from "child_process";

// Plugin that watches template.config.json and re-runs the config script on change
function templateConfigPlugin() {
  return {
    name: "watch-template-config",
    configureServer(server) {
      const configPath = resolve("template.config.json");
      server.watcher.add(configPath);
      server.watcher.on("change", (file) => {
        if (file === configPath) {
          console.log("\n[template] template.config.json changed, re-applying config...");
          try {
            execSync("node scripts/config.js", { stdio: "inherit" });
            console.log("[template] Config applied. Restart may be needed for some changes.\n");
          } catch (e) {
            console.error("[template] Failed to apply config:", e.message);
          }
        }
      });
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [vue(), templateConfigPlugin()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent vite from obscuring rust errors
  clearScreen: false,
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
  },
  // 3. to make use of `TAURI_DEBUG` and other env variables
  // https://tauri.studio/v1/api/config#buildconfig.beforedevcommand
  envPrefix: ["VITE_", "TAURI_"],
}));
