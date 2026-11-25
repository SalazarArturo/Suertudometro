import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { App } from 'supertest/types.js';
import { configurarAplicacion } from '../../src/configurar-aplicacion.js';
import { NotificacionesModulo } from '../../src/notificaciones.modulo.js';

/**
 * La aplicación completa, con la misma configuración que main.ts y conectada a
 * la base de Testcontainers. Sin RabbitMQ ni SMTP: no están configurados.
 */
export async function crearAplicacion(): Promise<INestApplication<App>> {
  const modulo = await Test.createTestingModule({
    imports: [NotificacionesModulo],
  }).compile();
  const app = configurarAplicacion(
    modulo.createNestApplication<INestApplication<App>>({ logger: ['error'] }),
  );
  await app.init();
  return app;
}
