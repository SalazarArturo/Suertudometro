import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { configurarAplicacion } from '../../src/configurar-aplicacion.js';
import { IdentidadModulo } from '../../src/identidad.modulo.js';

describe('GET /salud (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [IdentidadModulo],
    }).compile();
    app = configurarAplicacion(
      modulo.createNestApplication<INestApplication<App>>(),
    );
    await app.init();
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
