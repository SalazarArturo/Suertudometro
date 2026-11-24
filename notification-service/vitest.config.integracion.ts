import { defineConfig } from 'vitest/config';

// Pruebas de integración: repositorios y persistencia contra un PostgreSQL 18
// real, levantado con Testcontainers (docs/stack-y-convenciones.md §5.9).
// Necesitan Docker en marcha.
export default defineConfig({
  test: {
    globals: true,
    root: './',
    setupFiles: ['reflect-metadata'],
    include: ['test/integracion/**/*.integracion-spec.ts'],
    globalSetup: ['test/base-datos/preparar-base.ts'],
    // Todas las pruebas comparten una base: se ejecutan de a una.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 180_000,
  },
});
