import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types.js';
import type { PrismaServicio } from '../../src/infrastructure/persistencia/prisma.servicio.js';
import type { ClaimsDelToken } from '../../src/infrastructure/seguridad/emisor-tokens-jwt.js';
import { crearPrisma, vaciarTablas } from '../base-datos/base-datos.js';
import { crearAplicacion } from './aplicacion.js';
import {
  ADMIN_CONTRASENA_PRUEBA,
  ADMIN_CORREO_PRUEBA,
  JWT_SECRETO_PRUEBA,
} from './valores-entorno.js';

describe('Siembra del primer administrador (e2e)', () => {
  let prisma: PrismaServicio;
  let app: INestApplication<App>;

  beforeAll(async () => {
    // La base empieza vacía, como en el primer arranque del servicio.
    prisma = crearPrisma();
    await vaciarTablas(prisma);
    app = await crearAplicacion();
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('al arrancar crea la cuenta ADMINISTRADOR, con el nombre fijo, y publica UsuarioRegistrado', async () => {
    const cuentas = await prisma.cuentaUsuarioFila.findMany();
    expect(cuentas).toHaveLength(1);
    expect(cuentas[0]).toMatchObject({
      correo: ADMIN_CORREO_PRUEBA,
      nombre: 'Administrador',
      rol: 'ADMINISTRADOR',
    });

    const eventos = await prisma.eventoSalidaFila.findMany();
    expect(eventos).toHaveLength(1);
    expect(eventos[0].contenido).toMatchObject({
      tipoEvento: 'usuario.registrado',
      datos: { idUsuario: cuentas[0].id, correo: ADMIN_CORREO_PRUEBA },
    });
  });

  it('al reiniciar el servicio no crea otro ni publica otro evento', async () => {
    await app.close();
    app = await crearAplicacion();

    expect(await prisma.cuentaUsuarioFila.count()).toBe(1);
    expect(await prisma.eventoSalidaFila.count()).toBe(1);
  });

  it('el administrador inicia sesión y su token lleva el rol ADMINISTRADOR', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/api/identidad/sesiones')
      .send({
        correo: ADMIN_CORREO_PRUEBA,
        contrasena: ADMIN_CONTRASENA_PRUEBA,
      })
      .expect(200);
    const { tokenAcceso, usuario } = respuesta.body as {
      tokenAcceso: string;
      usuario: { rol: string; nombre: string };
    };

    expect(usuario).toMatchObject({
      rol: 'ADMINISTRADOR',
      nombre: 'Administrador',
    });
    const claims = new JwtService({
      secret: JWT_SECRETO_PRUEBA,
    }).verify<ClaimsDelToken>(tokenAcceso);
    expect(claims).toMatchObject({
      rol: 'ADMINISTRADOR',
      nombre: 'Administrador',
    });
  });
});
