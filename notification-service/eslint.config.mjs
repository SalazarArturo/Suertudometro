// @ts-check
import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import prettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import { reglasDeCapas } from './eslint.capas.mjs';

export default defineConfig(
  {
    ignores: [
      'dist/**',
      'coverage/**',
      '*.mjs',
      '*.d.mts',
      // Cliente de Prisma generado
      'src/infrastructure/persistencia/prisma/generado/**',
    ],
  },
  eslint.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
    },
  },
  {
    // En las pruebas es normal pasar métodos de un doble a expect().
    files: ['**/*.spec.ts', '**/*.e2e-spec.ts', '**/*.integracion-spec.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
  reglasDeCapas,
  prettier,
);
