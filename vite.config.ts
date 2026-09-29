import { defineConfig } from "vite";

// Deployed to GitHub Pages under https://mrshder.github.io/voxmute-archive/,
// so built asset URLs must carry the "/voxmute-archive/" prefix. Override with
// VITE_BASE when hosting somewhere else (set it to "/" for a root deploy).
export default defineConfig({
  base: process.env.VITE_BASE ?? "/voxmute-archive/",
  server: {
    port: 5173,
    open: true,
  },
});
