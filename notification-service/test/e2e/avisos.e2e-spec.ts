import { INestApplication } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { ProcesarEventoComando } from '../../src/application/comandos/procesar-evento/procesar-evento.comando.js';
import { PrismaServicio } from '../../src/infrastructure/persistencia/prisma.servicio.js';
import { vaciarTablas } from '../base-datos/base-datos.js';
import {
  ANA,
  aporteAnonimo,
  aporteRegistrado,
  BETO,
  CAMPANA,
  campanaPublicada,
  OLGA,
} from '../dobles/eventos.js';
import { crearAplicacion } from './aplicacion.js';

interface Pagina {
  elementos: { id: string; tipo: string; titulo: string; leido: boolean }[];
  totalElementos: number;
  totalPaginas: number;
}

const BASE = '/api/notificaciones/avisos';

describe('Avisos (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    app = await crearAplicacion();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await vaciarTablas(app.get(PrismaServicio));
    const bus = app.get(CommandBus);
    for (const evento of [
      campanaPublicada(),
      aporteRegistrado(),
      aporteAnonimo(BETO, 3),
    ]) {
      await bus.execute(new ProcesarEventoComando(evento));
    }
  });

  const como = (id: string) => ({
    'X-Usuario-Id': id,
    'X-Usuario-Rol': 'USUARIO',
    'X-Usuario-Nombre': 'Olga%20%C3%91and%C3%BA',
  });
  const get = (ruta: string, id = OLGA) =>
    request(app.getHttpServer()).get(ruta).set(como(id));
  const post = (ruta: string, id = OLGA) =>
    request(app.getHttpServer()).post(ruta).set(como(id));
  const bandeja = async (id = OLGA) =>
    (await get(BASE, id).expect(200)).body as Pagina;

  it('lista la bandeja propia, del más nuevo al más antiguo', async () => {
    const pagina = await bandeja();
    expect(pagina).toMatchObject({
      pagina: 1,
      tamano: 20,
      totalElementos: 3,
      totalPaginas: 1,
    });
    expect(pagina.elementos.map((aviso) => aviso.tipo)).toEqual([
      'APORTE_RECIBIDO',
      'APORTE_RECIBIDO',
      'CAMPANA_PUBLICADA',
    ]);
    expect(pagina.elementos[1]).toEqual({
      id: expect.any(String) as string,
      tipo: 'APORTE_RECIBIDO',
      titulo: 'Recibiste un aporte de Bs 150,00',
      mensaje:
        'Ana Pérez aportó Bs 150,00 a «Libros para la biblioteca». Su mensaje: «¡Mucho éxito!».',
      idCampana: CAMPANA,
      leido: false,
      ocurridoEn: '2026-11-24T15:02:00.000Z',
    });
    expect(JSON.stringify(pagina)).not.toContain(BETO);
  });

  it('cada persona ve solo lo suyo', async () => {
    expect((await bandeja(ANA)).totalElementos).toBe(0);
  });

  it('pagina', async () => {
    const { body } = (await get(`${BASE}?pagina=2&tamano=2`).expect(200)) as {
      body: Pagina;
    };
    expect(body).toMatchObject({ totalElementos: 3, totalPaginas: 2 });
    expect(body.elementos).toHaveLength(1);
  });

  it('marca uno como leído, filtra los no leídos y los cuenta', async () => {
    const [aviso] = (await bandeja()).elementos;
    await post(`${BASE}/${aviso.id}/lectura`).expect(204);
    await post(`${BASE}/${aviso.id}/lectura`).expect(204);

    await get(`${BASE}/no-leidos`).expect(200, { cantidad: 2 });
    const { body } = (await get(`${BASE}?soloNoLeidos=true`).expect(200)) as {
      body: Pagina;
    };
    expect(body.totalElementos).toBe(2);
    expect((await bandeja()).totalElementos).toBe(3);
  });

  it('soloNoLeidos=false no filtra', async () => {
    const [aviso] = (await bandeja()).elementos;
    await post(`${BASE}/${aviso.id}/lectura`).expect(204);
    const { body } = (await get(`${BASE}?soloNoLeidos=false`).expect(200)) as {
      body: Pagina;
    };
    expect(body.totalElementos).toBe(3);
  });

  it('marca todos como leídos', async () => {
    await post(`${BASE}/lectura`).expect(204);
    await get(`${BASE}/no-leidos`).expect(200, { cantidad: 0 });
  });

  it('marcar el aviso de otra persona da 404 y no lo cambia', async () => {
    const [aviso] = (await bandeja()).elementos;
    const respuesta = await post(`${BASE}/${aviso.id}/lectura`, ANA)
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);
    expect(respuesta.body).toMatchObject({
      type: 'https://api.suertudometro.com/errores/aviso-no-encontrado',
      status: 404,
      instance: `${BASE}/${aviso.id}/lectura`,
    });
    await get(`${BASE}/no-leidos`).expect(200, { cantidad: 3 });
  });

  it('un id que no es UUID da 400 id-aviso-invalido', async () => {
    const respuesta = await post(`${BASE}/x/lectura`).expect(400);
    expect(respuesta.body).toMatchObject({
      type: 'https://api.suertudometro.com/errores/id-aviso-invalido',
    });
  });

  it.each([
    'pagina=0',
    'pagina=x',
    'pagina=1.5',
    'tamano=0',
    'tamano=101',
    'soloNoLeidos=si',
    'otro=1',
  ])('con ?%s da 400 validacion', async (consulta) => {
    const respuesta = await get(`${BASE}?${consulta}`).expect(400);
    expect(respuesta.body).toMatchObject({
      type: 'https://api.suertudometro.com/errores/validacion',
      status: 400,
    });
    const { errores } = respuesta.body as { errores: { campo: string }[] };
    expect(new Set(errores.map((error) => error.campo))).toEqual(
      new Set([consulta.split('=')[0]]),
    );
  });

  it.each([
    ['get', BASE],
    ['get', `${BASE}/no-leidos`],
    ['post', `${BASE}/lectura`],
    ['post', `${BASE}/${CAMPANA}/lectura`],
  ] as const)('sin identidad, %s %s da 401', async (metodo, ruta) => {
    const respuesta = await request(app.getHttpServer())
      [metodo](ruta)
      .expect(401);
    expect(respuesta.body).toMatchObject({
      type: 'https://api.suertudometro.com/errores/no-autenticado',
    });
  });

  it('GET /salud responde sin identidad', async () => {
    await request(app.getHttpServer())
      .get('/salud')
      .expect(200, { estado: 'ok' });
  });

  it('documenta la API en Swagger, sin el healthcheck', async () => {
    const { body } = (await request(app.getHttpServer())
      .get('/api/notificaciones/docs-json')
      .expect(200)) as { body: { paths: Record<string, object> } };
    expect(Object.keys(body.paths).sort()).toEqual([
      BASE,
      `${BASE}/lectura`,
      `${BASE}/no-leidos`,
      `${BASE}/{id}/lectura`,
    ]);
    await request(app.getHttpServer())
      .get('/api/notificaciones/docs')
      .expect(200)
      .expect('Content-Type', /text\/html/);
  });
});
