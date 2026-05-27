import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Tauri requires fixed port; Docker also uses 80101
const port = parseInt(process.env.VITE_PORT || "1420");

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    hmr: { protocol: "ws", host: "localhost" },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    outDir: "dist",
    target: "es2022",
    minify: "esbuild",
    sourcemap: false,
  },
});
