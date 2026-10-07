/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

// Base path matches the GitHub Pages URL of https://github.com/FatkhulB/StoneBound
// (served at https://fatkhulb.github.io/StoneBound/).
export default defineConfig({
  base: '/StoneBound/',
  server: {
    port: 8080,
    host: true,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
  },
});
