import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaServicio } from '../../src/infrastructure/persistencia/prisma.servicio.js';
import { vaciarTablas } from '../base-datos/base-datos.js';
import { crearAplicacion } from './aplicacion.js';

const RUTA = '/api/identidad/perfil';
const PROBLEMA = /^application\/problem\+json/;

const ANA = {
  nombre: 'Ana Pérez',
  correo: 'ana@example.org',
  contrasena: 'una frase larga y secreta',
};

/** Los headers que pondría el gateway para Ana (§5.1). */
const cabecerasDe = (id: string, cambios: Record<string, string> = {}) => ({
  'X-Usuario-Id': id,
  'X-Usuario-Rol': 'USUARIO',
  'X-Usuario-Nombre': encodeURIComponent('Ana Pérez'),
  ...cambios,
});

describe('GET /api/identidad/perfil (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaServicio;
  let cuentaAna: { id: string };

  beforeAll(async () => {
    app = await crearAplicacion();
    prisma = app.get(PrismaServicio);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await vaciarTablas(prisma);
    const registro = await request(app.getHttpServer())
      .post('/api/identidad/usuarios')
      .send(ANA)
      .expect(201);
    cuentaAna = registro.body as { id: string };
  });

  const pedirPerfil = (cabeceras: Record<string, string>) =>
    request(app.getHttpServer()).get(RUTA).set(cabeceras);

  it('200 con la cuenta de quien hace la petición, igual que en el registro', async () => {
    const respuesta = await pedirPerfil(cabecerasDe(cuentaAna.id)).expect(200);

    expect(respuesta.body).toEqual(cuentaAna);
  });

  it('401 no-autenticado sin los headers del gateway', async () => {
    const respuesta = await pedirPerfil({})
      .expect(401)
      .expect('Content-Type', PROBLEMA);

    expect(respuesta.body).toEqual({
      type: 'https://api.suertudometro.com/errores/no-autenticado',
      title: 'No autenticado',
      status: 401,
      detail: 'Hace falta iniciar sesión: falta el header X-Usuario-Id.',
      instance: RUTA,
    });
  });

  it('401 con solo el token: el servicio no valida el JWT, lee los headers del gateway', async () => {
    const sesion = await request(app.getHttpServer())
      .post('/api/identidad/sesiones')
      .send({ correo: ANA.correo, contrasena: ANA.contrasena })
      .expect(200);
    const { tokenAcceso } = sesion.body as { tokenAcceso: string };

    await pedirPerfil({ Authorization: `Bearer ${tokenAcceso}` }).expect(401);
  });

  it('401 con un rol que no existe', async () => {
    const respuesta = await pedirPerfil(
      cabecerasDe(cuentaAna.id, { 'X-Usuario-Rol': 'ORGANIZADOR' }),
    ).expect(401);

    expect(respuesta.body).toMatchObject({
      type: 'https://api.suertudometro.com/errores/no-autenticado',
    });
  });

  it('404 usuario-no-encontrado si la cuenta ya no existe', async () => {
    const respuesta = await pedirPerfil(
      cabecerasDe('00000000-0000-4000-8000-000000000000'),
    )
      .expect(404)
      .expect('Content-Type', PROBLEMA);

    expect(respuesta.body).toMatchObject({
      type: 'https://api.suertudometro.com/errores/usuario-no-encontrado',
      status: 404,
    });
  });

  it('400 id-usuario-invalido si el id no es un UUID', async () => {
    const respuesta = await pedirPerfil(cabecerasDe('no-es-un-uuid')).expect(
      400,
    );

    expect(respuesta.body).toMatchObject({
      type: 'https://api.suertudometro.com/errores/id-usuario-invalido',
    });
  });
});
