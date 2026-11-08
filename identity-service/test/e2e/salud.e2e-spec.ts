import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { crearAplicacion } from './aplicacion.js';

describe('GET /salud (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearAplicacion();
  });

  afterAll(async () => {
    await app.close();
  });

  it('responde 200 con el estado del servicio', () => {
    return request(app.getHttpServer())
      .get('/salud')
      .expect(200)
      .expect({ estado: 'ok' });
  });

  it('queda fuera del prefijo /api/identidad', () => {
    return request(app.getHttpServer()).get('/api/identidad/salud').expect(404);
  });
});
