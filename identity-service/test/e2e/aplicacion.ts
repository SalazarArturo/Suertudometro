import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { configurarAplicacion } from '../../src/configurar-aplicacion.js';
import { IdentidadModulo } from '../../src/identidad.modulo.js';

/**
 * La aplicación completa, con la misma configuración que main.ts y conectada a
 * la base de Testcontainers. Solo muestra en consola los errores y avisos.
 */
export async function crearAplicacion(): Promise<INestApplication<App>> {
  const modulo = await Test.createTestingModule({
    imports: [IdentidadModulo],
  }).compile();
  const app = configurarAplicacion(
    modulo.createNestApplication<INestApplication<App>>({
      logger: ['error', 'warn'],
    }),
  );
  await app.init();
  return app;
}
