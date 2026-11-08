import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { crearAplicacion } from './aplicacion.js';

interface Esquema {
  properties: Record<string, unknown>;
  required?: string[];
}

interface DocumentoOpenApi {
  openapi: string;
  paths: Record<
    string,
    Record<string, { responses: Record<string, { content?: object }> }>
  >;
  components: { schemas: Record<string, Esquema> };
}

describe('Documentación OpenAPI (e2e)', () => {
  let app: INestApplication<App>;
  let documento: DocumentoOpenApi;

  beforeAll(async () => {
    app = await crearAplicacion();
    const respuesta = await request(app.getHttpServer())
      .get('/api/identidad/docs-json')
      .expect(200);
    documento = respuesta.body as DocumentoOpenApi;
  });

  afterAll(async () => {
    await app.close();
  });

  it('es OpenAPI 3 y documenta POST /api/identidad/usuarios con sus respuestas', () => {
    expect(documento.openapi).toMatch(/^3\./);
    const respuestas =
      documento.paths['/api/identidad/usuarios'].post.responses;
    expect(Object.keys(respuestas).sort()).toEqual(['201', '400', '409']);
    expect(respuestas['400'].content).toHaveProperty([
      'application/problem+json',
    ]);
    expect(respuestas['409'].content).toHaveProperty([
      'application/problem+json',
    ]);
  });

  it('no publica el healthcheck interno', () => {
    expect(Object.keys(documento.paths)).not.toContain('/salud');
  });

  it('la respuesta del usuario no tiene ningún campo de contraseña', () => {
    expect(
      Object.keys(documento.components.schemas['UsuarioRespuesta'].properties),
    ).toEqual(['id', 'nombre', 'correo', 'rol', 'registradoEn']);
  });

  it('la petición de registro exige nombre, correo y contraseña', () => {
    expect(
      documento.components.schemas['RegistrarUsuarioPeticion'].required?.sort(),
    ).toEqual(['contrasena', 'correo', 'nombre']);
  });

  it('sirve Swagger UI en /api/identidad/docs', () => {
    return request(app.getHttpServer())
      .get('/api/identidad/docs')
      .expect(200)
      .expect('Content-Type', /text\/html/);
  });
});
