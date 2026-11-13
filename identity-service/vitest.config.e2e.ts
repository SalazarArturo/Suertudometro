import { defineConfig } from 'vitest/config';

// Pruebas de punta a punta de la API: Supertest sobre la aplicación Nest
// completa, contra un PostgreSQL 18 real levantado con Testcontainers.
// Necesitan Docker en marcha.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    setupFiles: ['reflect-metadata', 'test/e2e/entorno.ts'],
    include: ['test/e2e/**/*.e2e-spec.ts'],
    globalSetup: ['test/base-datos/preparar-base.ts'],
    // Todas las pruebas comparten una base: se ejecutan de a una.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
