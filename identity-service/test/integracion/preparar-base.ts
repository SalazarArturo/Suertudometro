import { PostgreSqlContainer } from '@testcontainers/postgresql';
import type { TestProject } from 'vitest/node';
import { ejecutarPrisma } from './prisma-cli.js';

declare module 'vitest' {
  export interface ProvidedContext {
    urlBaseDatos: string;
  }
}

/**
 * Levanta un PostgreSQL 18 desechable, le aplica las migraciones igual que en
 * producción (`prisma migrate deploy`) y comparte su URL con las pruebas.
 * Al terminar, borra el contenedor.
 */
export default async function prepararBase(proyecto: TestProject) {
  const contenedor = await new PostgreSqlContainer('postgres:18-alpine')
    .withDatabase('identity')
    .withUsername('identity')
    .withPassword('identity')
    .start();
  const urlBaseDatos = contenedor.getConnectionUri();

  ejecutarPrisma(['migrate', 'deploy'], urlBaseDatos);
  proyecto.provide('urlBaseDatos', urlBaseDatos);

  return async () => {
    await contenedor.stop();
  };
}
