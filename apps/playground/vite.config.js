import { defineConfig } from 'vite';

// Plain JavaScript, no framework: the playground exists to feel the engine's mechanics
// in a browser before any native UI is written. 5174 so it never collides with a
// canvass-app client (5173) running on the same machine.
export default defineConfig({
  server: { port: 5174 },
});
