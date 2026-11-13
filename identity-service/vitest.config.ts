import { defineConfig } from 'vitest/config';

// Pruebas unitarias: dominio, aplicación y reglas de arquitectura.
// No usan base de datos, red ni el contexto web (docs/stack-y-convenciones.md §5.9).
export default defineConfig({
  test: {
    globals: true,
    root: './',
    // Los decoradores de class-validator y de NestJS necesitan Reflect.getMetadata.
    setupFiles: ['reflect-metadata'],
    include: ['src/**/*.spec.ts', 'test/arquitectura/**/*.spec.ts'],
  },
});
