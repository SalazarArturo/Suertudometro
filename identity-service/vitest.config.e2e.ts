import { defineConfig } from 'vitest/config';

// Pruebas de punta a punta de la API, con Supertest sobre la aplicación Nest.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    setupFiles: ['reflect-metadata'],
    include: ['test/e2e/**/*.e2e-spec.ts'],
  },
});
