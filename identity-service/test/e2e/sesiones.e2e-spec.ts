import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { ClaimsDelToken } from '../../src/infrastructure/seguridad/emisor-tokens-jwt.js';
import { PrismaServicio } from '../../src/infrastructure/persistencia/prisma.servicio.js';
import { vaciarTablas } from '../base-datos/base-datos.js';
import { crearAplicacion } from './aplicacion.js';
import { JWT_DURACION_PRUEBA, JWT_SECRETO_PRUEBA } from './valores-entorno.js';

const RUTA = '/api/identidad/sesiones';
const PROBLEMA = /^application\/problem\+json/;

const ANA = {
  nombre: 'Ana Pérez',
  correo: 'ana@example.org',
  contrasena: 'una frase larga y secreta',
};

interface CuerpoInicioSesion {
  tokenAcceso: string;
  tipoToken: string;
  expiraEn: string;
  usuario: { id: string; nombre: string; correo: string; rol: string };
}

describe('POST /api/identidad/sesiones (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaServicio;
  let idAna: string;
  const jwt = new JwtService({ secret: JWT_SECRETO_PRUEBA });

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
    idAna = (registro.body as { id: string }).id;
  });

  const iniciarSesion = (cuerpo: object) =>
    request(app.getHttpServer()).post(RUTA).send(cuerpo);

  describe('200', () => {
    it('devuelve el token Bearer y el usuario', async () => {
      const respuesta = await iniciarSesion({
        correo: ANA.correo,
        contrasena: ANA.contrasena,
      })
        .expect(200)
        .expect('Content-Type', /^application\/json/);

      expect(respuesta.body).toEqual({
        tokenAcceso: expect.any(String) as string,
        tipoToken: 'Bearer',
        expiraEn: expect.any(String) as string,
        usuario: {
          id: idAna,
          nombre: 'Ana Pérez',
          correo: 'ana@example.org',
          rol: 'USUARIO',
        },
      });
    });

    it('el token es un JWT HS256 con exactamente los claims del contrato (§5.1), firmado con JWT_SECRETO', async () => {
      const respuesta = await iniciarSesion({
        correo: ANA.correo,
        contrasena: ANA.contrasena,
      }).expect(200);
      const { tokenAcceso, expiraEn } = respuesta.body as CuerpoInicioSesion;

      expect(jwt.decode(tokenAcceso, { complete: true })).toMatchObject({
        header: { alg: 'HS256', typ: 'JWT' },
      });
      const claims = jwt.verify<ClaimsDelToken>(tokenAcceso, {
        algorithms: ['HS256'],
      });
      expect(Object.keys(claims).sort()).toEqual([
        'correo',
        'exp',
        'iat',
        'nombre',
        'rol',
        'sub',
      ]);
      expect(claims).toMatchObject({
        sub: idAna,
        correo: 'ana@example.org',
        nombre: 'Ana Pérez',
        rol: 'USUARIO',
      });
      expect(claims.exp - claims.iat).toBe(JWT_DURACION_PRUEBA);
      expect(expiraEn).toBe(new Date(claims.exp * 1000).toISOString());
    });

    it('no distingue mayúsculas ni espacios en el correo', async () => {
      await iniciarSesion({
        correo: '  ANA@Example.org ',
        contrasena: ANA.contrasena,
      }).expect(200);
    });

    it('anota el último inicio de sesión, y SesionIniciada no sale al bus', async () => {
      await iniciarSesion({
        correo: ANA.correo,
        contrasena: ANA.contrasena,
      }).expect(200);

      const fila = await prisma.cuentaUsuarioFila.findUniqueOrThrow({
        where: { id: idAna },
      });
      expect(fila.ultimoInicioSesionEn).toBeInstanceOf(Date);
      // Solo está el UsuarioRegistrado del registro.
      const eventos = await prisma.eventoSalidaFila.findMany();
      expect(eventos.map((evento) => evento.tipoEvento)).toEqual([
        'usuario.registrado',
      ]);
    });
  });

  describe('401 credenciales-invalidas (R7)', () => {
    it('con la contraseña incorrecta', async () => {
      const respuesta = await iniciarSesion({
        correo: ANA.correo,
        contrasena: 'otra frase cualquiera',
      })
        .expect(401)
        .expect('Content-Type', PROBLEMA);

      expect(respuesta.body).toEqual({
        type: 'https://api.suertudometro.com/errores/credenciales-invalidas',
        title: 'No autenticado',
        status: 401,
        detail: 'El correo o la contraseña no son correctos.',
        instance: RUTA,
      });
    });

    it('con un correo que no existe, la respuesta es idéntica', async () => {
      const contrasenaMala = await iniciarSesion({
        correo: ANA.correo,
        contrasena: 'otra frase cualquiera',
      }).expect(401);
      const correoInexistente = await iniciarSesion({
        correo: 'nadie@example.org',
        contrasena: 'otra frase cualquiera',
      }).expect(401);

      expect(correoInexistente.body).toEqual(contrasenaMala.body);
    });
  });

  describe('400', () => {
    it('validacion si falta la contraseña', async () => {
      const respuesta = await iniciarSesion({ correo: ANA.correo })
        .expect(400)
        .expect('Content-Type', PROBLEMA);

      expect(respuesta.body).toMatchObject({
        type: 'https://api.suertudometro.com/errores/validacion',
        errores: [
          {
            campo: 'contrasena',
            mensaje: 'Es obligatorio y debe ser un texto.',
          },
        ],
      });
    });

    it('correo-invalido si el correo no tiene formato de correo', async () => {
      const respuesta = await iniciarSesion({
        correo: 'no-es-un-correo',
        contrasena: ANA.contrasena,
      }).expect(400);

      expect(respuesta.body).toMatchObject({
        type: 'https://api.suertudometro.com/errores/correo-invalido',
      });
    });
  });
});
