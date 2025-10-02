// vite.config.js
import { defineConfig } from 'vite';

const isUserSite = process.env.GH_PAGES_BASE === '/';
export default defineConfig({
  base: process.env.GH_PAGES_BASE || '/', // set via workflow below
  build: {
    outDir: 'dist'
  }
});
