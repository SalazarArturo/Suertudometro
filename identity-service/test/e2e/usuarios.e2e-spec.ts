import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { PrismaServicio } from '../../src/infrastructure/persistencia/prisma.servicio.js';
import { vaciarTablas } from '../base-datos/base-datos.js';
import { crearAplicacion } from './aplicacion.js';

const RUTA = '/api/identidad/usuarios';
const PROBLEMA = /^application\/problem\+json/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const ANA = {
  nombre: 'Ana Pérez',
  correo: 'ana@example.org',
  contrasena: 'una frase larga y secreta',
};

interface CuerpoUsuario {
  id: string;
}

interface CuerpoProblema {
  type: string;
  errores?: { campo: string; mensaje: string }[];
}

describe('POST /api/identidad/usuarios (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaServicio;

  beforeAll(async () => {
    app = await crearAplicacion();
    prisma = app.get(PrismaServicio);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await vaciarTablas(prisma);
  });

  const registrar = (cuerpo: object) =>
    request(app.getHttpServer()).post(RUTA).send(cuerpo);

  const cantidadDeCuentas = () => prisma.cuentaUsuarioFila.count();

  describe('201', () => {
    it('devuelve la cuenta USUARIO creada, con el correo normalizado', async () => {
      const respuesta = await registrar({
        ...ANA,
        correo: '  Ana@Example.ORG ',
      })
        .expect(201)
        .expect('Content-Type', /^application\/json/);

      expect(respuesta.body).toEqual({
        id: expect.stringMatching(UUID) as string,
        nombre: 'Ana Pérez',
        correo: 'ana@example.org',
        rol: 'USUARIO',
        registradoEn: expect.any(String) as string,
      });
      const { registradoEn } = respuesta.body as { registradoEn: string };
      expect(new Date(registradoEn).toISOString()).toBe(registradoEn);
    });

    it('nunca devuelve la contraseña ni su hash (R5), pero guarda el hash argon2id', async () => {
      const respuesta = await registrar(ANA).expect(201);

      expect(respuesta.text).not.toMatch(/hash|argon2|contrasena/i);
      expect(respuesta.text).not.toContain(ANA.contrasena);
      const fila = await prisma.cuentaUsuarioFila.findUniqueOrThrow({
        where: { id: (respuesta.body as CuerpoUsuario).id },
      });
      expect(fila.hashContrasena).toMatch(/^\$argon2id\$/);
    });

    it('deja UsuarioRegistrado en el outbox, en la misma transacción', async () => {
      const respuesta = await registrar(ANA).expect(201);

      const eventos = await prisma.eventoSalidaFila.findMany();
      expect(eventos).toHaveLength(1);
      expect(eventos[0].contenido).toMatchObject({
        tipoEvento: 'usuario.registrado',
        version: 1,
        datos: {
          idUsuario: (respuesta.body as CuerpoUsuario).id,
          correo: 'ana@example.org',
        },
      });
    });
  });

  describe('409', () => {
    it('correo-ya-registrado, aunque el correo cambie de mayúsculas (R2)', async () => {
      await registrar(ANA).expect(201);

      const respuesta = await registrar({
        ...ANA,
        nombre: 'Otra Ana',
        correo: 'ANA@example.org',
      })
        .expect(409)
        .expect('Content-Type', PROBLEMA);

      expect(respuesta.body).toEqual({
        type: 'https://api.suertudometro.com/errores/correo-ya-registrado',
        title: 'Conflicto',
        status: 409,
        detail: 'Ya existe una cuenta con ese correo.',
        instance: RUTA,
      });
      expect(await cantidadDeCuentas()).toBe(1);
      expect(await prisma.eventoSalidaFila.count()).toBe(1);
    });
  });

  describe('400 validacion: la forma de la petición', () => {
    it('lista cada campo que falta', async () => {
      const respuesta = await registrar({})
        .expect(400)
        .expect('Content-Type', PROBLEMA);

      const cuerpo = respuesta.body as CuerpoProblema;
      expect(cuerpo).toMatchObject({
        type: 'https://api.suertudometro.com/errores/validacion',
        title: 'Solicitud incorrecta',
        status: 400,
        instance: RUTA,
      });
      expect(cuerpo.errores?.map((error) => error.campo).sort()).toEqual([
        'contrasena',
        'correo',
        'nombre',
      ]);
    });

    it('rechaza un campo que no es texto', async () => {
      const respuesta = await registrar({ ...ANA, nombre: 123 }).expect(400);

      expect((respuesta.body as CuerpoProblema).errores).toEqual([
        { campo: 'nombre', mensaje: 'Es obligatorio y debe ser un texto.' },
      ]);
    });

    it('rechaza un rol en el cuerpo: el registro público siempre crea USUARIO (R6)', async () => {
      const respuesta = await registrar({
        ...ANA,
        rol: 'ADMINISTRADOR',
      }).expect(400);

      expect((respuesta.body as CuerpoProblema).errores).toEqual([
        { campo: 'rol', mensaje: 'No es un campo permitido.' },
      ]);
      expect(await cantidadDeCuentas()).toBe(0);
    });

    it('rechaza un cuerpo que no es un objeto', async () => {
      const respuesta = await registrar([ANA]).expect(400);

      expect(respuesta.body).toMatchObject({
        type: 'https://api.suertudometro.com/errores/validacion',
      });
    });
  });

  describe('400 con el código de la regla de dominio', () => {
    it.each([
      ['correo', 'no-es-un-correo', 'correo-invalido'],
      ['nombre', ' A ', 'nombre-invalido'],
      ['contrasena', 'corta', 'contrasena-invalida'],
    ])('%s = "%s" responde %s', async (campo, valor, codigo) => {
      const respuesta = await registrar({ ...ANA, [campo]: valor })
        .expect(400)
        .expect('Content-Type', PROBLEMA);

      expect(respuesta.body).toMatchObject({
        type: `https://api.suertudometro.com/errores/${codigo}`,
        status: 400,
        detail: expect.any(String) as string,
        instance: RUTA,
      });
      expect(await cantidadDeCuentas()).toBe(0);
    });
  });

  describe('errores HTTP genéricos, también en RFC 9457', () => {
    it('JSON mal formado: 400 about:blank', async () => {
      const respuesta = await request(app.getHttpServer())
        .post(RUTA)
        .set('Content-Type', 'application/json')
        .send('{"nombre":')
        .expect(400)
        .expect('Content-Type', PROBLEMA);

      expect(respuesta.body).toMatchObject({
        type: 'about:blank',
        status: 400,
      });
    });

    it('ruta inexistente: 404 about:blank', async () => {
      const respuesta = await request(app.getHttpServer())
        .get('/api/identidad/nada')
        .expect(404)
        .expect('Content-Type', PROBLEMA);

      expect(respuesta.body).toMatchObject({
        type: 'about:blank',
        title: 'No encontrado',
        status: 404,
        instance: '/api/identidad/nada',
      });
    });
  });
});
