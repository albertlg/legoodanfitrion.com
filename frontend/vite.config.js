import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [tailwindcss()],
  esbuild: {
    jsx: "automatic"
  },
  server: {
    host: true,
    port: 5173,
    strictPort: true
  }
});
