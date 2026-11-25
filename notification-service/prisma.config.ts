import { defineConfig } from 'prisma/config';

// En desarrollo, DATABASE_URL puede venir de un archivo .env, que no se versiona
// (ver .env.example). En Docker, en el CI y en las pruebas llega como variable de
// entorno, y entonces el .env no se lee: así las pruebas nunca migran la base
// de desarrollo por accidente.
if (process.env['DATABASE_URL'] === undefined) {
  try {
    process.loadEnvFile();
  } catch {
    // No hay .env: Prisma avisará si un comando necesita la base.
  }
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env['DATABASE_URL'],
  },
});
