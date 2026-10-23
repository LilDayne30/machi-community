import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
  root: "admin",
  plugins: [react()],
  server: {
    port: 5174,
    strictPort: true,
    host: "127.0.0.1",
    fs: { allow: [".."] },
    proxy: { "/api": "http://127.0.0.1:8788" },
  },
  build: { outDir: "../dist/admin", emptyOutDir: true },
});
