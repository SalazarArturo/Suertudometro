import { randomUUID } from 'node:crypto';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RabbitMQContainer,
  type StartedRabbitMQContainer,
} from '@testcontainers/rabbitmq';
import {
  connect,
  type Channel,
  type ChannelModel,
  type GetMessage,
} from 'amqplib';
import { Correo } from '../../../src/domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../../src/domain/cuenta-usuario/cuenta-usuario.js';
import { HashContrasena } from '../../../src/domain/cuenta-usuario/hash-contrasena.js';
import { IdUsuario } from '../../../src/domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../../src/domain/cuenta-usuario/nombre-usuario.js';
import { ConexionRabbitmq } from '../../../src/infrastructure/mensajeria/conexion-rabbitmq.js';
import { PublicadorEventosSalida } from '../../../src/infrastructure/mensajeria/publicador-eventos-salida.js';
import { PrismaServicio } from '../../../src/infrastructure/persistencia/prisma.servicio.js';
import { RepositorioCuentasUsuarioPrisma } from '../../../src/infrastructure/persistencia/repositorio-cuentas-usuario.prisma.js';
import { crearPrisma, vaciarTablas } from '../../base-datos/base-datos.js';
import { RelojFijo } from '../../dobles/reloj-fijo.js';

const EXCHANGE = 'suertudometro.events';
const HASH = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA';
const REGISTRO = new Date('2026-11-17T14:00:00.000Z');
const PUBLICACION = new Date('2026-11-17T14:00:05.000Z');

describe('PublicadorEventosSalida (RabbitMQ y PostgreSQL)', () => {
  let rabbit: StartedRabbitMQContainer;
  let prisma: PrismaServicio;
  let repositorio: RepositorioCuentasUsuarioPrisma;
  // Cliente de la prueba: hace de consumidor.
  let cliente: ChannelModel;
  let canal: Channel;
  const conexiones: ConexionRabbitmq[] = [];
  const colas: string[] = [];

  beforeAll(async () => {
    rabbit = await new RabbitMQContainer('rabbitmq:4.3-alpine').start();
    prisma = crearPrisma();
    repositorio = new RepositorioCuentasUsuarioPrisma(prisma);
    await abrirCliente();
    // Los avisos del publicador ensucian la salida de las pruebas.
    vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    await cliente?.close().catch(() => undefined);
    await prisma?.$disconnect();
    await rabbit?.stop();
  });

  beforeEach(async () => {
    await vaciarTablas(prisma);
  });

  afterEach(async () => {
    for (const conexion of conexiones.splice(0)) {
      await conexion.onApplicationShutdown();
    }
    // Sin colas sobrantes: una prueba no recibe los eventos de otra.
    for (const cola of colas.splice(0)) {
      await canal.deleteQueue(cola);
    }
  });

  async function abrirCliente(): Promise<void> {
    cliente = await connect(rabbit.getAmqpUrl());
    canal = await cliente.createChannel();
    await canal.assertExchange(EXCHANGE, 'topic', { durable: true });
  }

  function nuevoPublicador(
    url = rabbit.getAmqpUrl(),
    intervaloMs = 2_000,
  ): PublicadorEventosSalida {
    const configuracion = new ConfigService({
      RABBITMQ_URL: url,
      OUTBOX_INTERVALO_MS: intervaloMs,
    });
    const conexion = new ConexionRabbitmq(configuracion);
    conexiones.push(conexion);
    return new PublicadorEventosSalida(
      prisma,
      conexion,
      configuracion,
      new RelojFijo(PUBLICACION),
    );
  }

  /**
   * Una cola como la de un consumidor de usuario.registrado. Durable, como las
   * de los servicios: RabbitMQ 4.3 cierra la conexión si se declara una cola no
   * durable que no es exclusiva. Se borra al terminar cada prueba.
   */
  async function crearCola(): Promise<string> {
    const cola = `prueba.${randomUUID()}`;
    await canal.assertQueue(cola, { durable: true });
    await canal.bindQueue(cola, EXCHANGE, 'usuario.registrado');
    colas.push(cola);
    return cola;
  }

  async function leerCola(cola: string): Promise<GetMessage[]> {
    const mensajes: GetMessage[] = [];
    for (;;) {
      const mensaje = await canal.get(cola, { noAck: true });
      if (mensaje === false) {
        return mensajes;
      }
      mensajes.push(mensaje);
    }
  }

  async function registrar(correo: string): Promise<CuentaUsuario> {
    const cuenta = CuentaUsuario.registrar({
      id: IdUsuario.nuevo(),
      correo: Correo.de(correo),
      nombre: NombreUsuario.de('Begoña Pérez'),
      hashContrasena: HashContrasena.de(HASH),
      ahora: REGISTRO,
    });
    await repositorio.guardar(cuenta);
    return cuenta;
  }

  async function esperarHasta<T>(
    intento: () => Promise<T | null>,
    ms: number,
  ): Promise<T> {
    const limite = Date.now() + ms;
    for (;;) {
      const resultado = await intento();
      if (resultado !== null) {
        return resultado;
      }
      if (Date.now() > limite) {
        throw new Error(`No ocurrió en ${ms} ms`);
      }
      await new Promise((resolver) => setTimeout(resolver, 200));
    }
  }

  it('publica un UsuarioRegistrado pendiente con su envelope y lo marca como publicado', async () => {
    const cola = await crearCola();
    const cuenta = await registrar('begoña@example.org');
    const [fila] = await prisma.eventoSalidaFila.findMany();

    const resultado = await nuevoPublicador().publicarPendientes();

    expect(resultado).toEqual({
      sinConexion: false,
      publicados: 1,
      fallidos: 0,
      primerError: undefined,
    });
    const [mensaje] = await leerCola(cola);
    expect(JSON.parse(mensaje.content.toString('utf8'))).toEqual({
      idEvento: fila.idEvento,
      tipoEvento: 'usuario.registrado',
      version: 1,
      ocurridoEn: REGISTRO.toISOString(),
      datos: { idUsuario: cuenta.id.valor, correo: 'begoña@example.org' },
    });
    expect(mensaje.fields).toMatchObject({
      exchange: EXCHANGE,
      routingKey: 'usuario.registrado',
    });
    expect(mensaje.properties).toMatchObject({
      messageId: fila.idEvento,
      contentType: 'application/json',
      deliveryMode: 2,
      type: 'usuario.registrado',
    });
    expect(
      await prisma.eventoSalidaFila.findUnique({
        where: { idEvento: fila.idEvento },
      }),
    ).toMatchObject({
      publicadoEn: PUBLICACION,
      intentos: 0,
      ultimoError: null,
    });
  });

  it('si ninguna cola recibe el evento, queda pendiente con un intento, y sale cuando aparece la cola', async () => {
    await registrar('ana@example.org');
    const publicador = nuevoPublicador();

    const sinCola = await publicador.publicarPendientes();

    expect(sinCola).toMatchObject({ publicados: 0, fallidos: 1 });
    expect(sinCola.primerError).toMatch(
      /^Ninguna cola recibe usuario\.registrado \(NO_ROUTE\)/,
    );
    const pendiente = await prisma.eventoSalidaFila.findFirstOrThrow();
    expect(pendiente.publicadoEn).toBeNull();
    expect(pendiente.intentos).toBe(1);
    expect(pendiente.ultimoError).toContain('NO_ROUTE');

    const cola = await crearCola();
    const conCola = await publicador.publicarPendientes();

    expect(conCola).toMatchObject({ publicados: 1, fallidos: 0 });
    expect(await leerCola(cola)).toHaveLength(1);
    expect(await prisma.eventoSalidaFila.findFirstOrThrow()).toMatchObject({
      publicadoEn: PUBLICACION,
      intentos: 1,
    });
  });

  it('no vuelve a publicar un evento ya publicado', async () => {
    const cola = await crearCola();
    const idEvento = randomUUID();
    await prisma.eventoSalidaFila.create({
      data: {
        idEvento,
        tipoEvento: 'usuario.registrado',
        version: 1,
        contenido: { idEvento },
        ocurridoEn: REGISTRO,
        publicadoEn: REGISTRO,
      },
    });

    const resultado = await nuevoPublicador().publicarPendientes();

    expect(resultado).toMatchObject({ publicados: 0, fallidos: 0 });
    expect(await leerCola(cola)).toHaveLength(0);
  });

  it('dos publicadores a la vez no publican dos veces el mismo evento', async () => {
    const cola = await crearCola();
    for (let i = 1; i <= 12; i++) {
      await registrar(`persona${i}@example.org`);
    }

    const resultados = await Promise.all([
      nuevoPublicador().publicarPendientes(),
      nuevoPublicador().publicarPendientes(),
    ]);

    expect(resultados[0].publicados + resultados[1].publicados).toBe(12);
    const mensajes = await leerCola(cola);
    expect(mensajes).toHaveLength(12);
    const ids = mensajes.map((m) => String(m.properties.messageId));
    expect(new Set(ids).size).toBe(12);
    expect(
      await prisma.eventoSalidaFila.count({ where: { publicadoEn: null } }),
    ).toBe(0);
  });

  it('sin conexión con RabbitMQ, no toca los eventos: siguen pendientes y sin intentos', async () => {
    await registrar('ana@example.org');
    // Nadie escucha en el puerto 1.
    const publicador = nuevoPublicador('amqp://guest:guest@127.0.0.1:1');

    const resultado = await publicador.publicarPendientes();

    expect(resultado).toEqual({
      sinConexion: true,
      publicados: 0,
      fallidos: 0,
    });
    expect(await prisma.eventoSalidaFila.findFirstOrThrow()).toMatchObject({
      publicadoEn: null,
      intentos: 0,
    });
  });

  it('si RabbitMQ cierra la conexión, se reconecta y publica lo pendiente', async () => {
    const cola = await crearCola();
    const publicador = nuevoPublicador();
    await registrar('ana@example.org');
    expect(await publicador.publicarPendientes()).toMatchObject({
      publicados: 1,
    });

    const cierre = await rabbit.exec([
      'rabbitmqctl',
      'close_all_connections',
      'prueba de reconexion',
    ]);
    expect(cierre.exitCode).toBe(0);
    await abrirCliente(); // la conexión de la prueba también se cerró
    await registrar('beto@example.org');

    await esperarHasta(async () => {
      const resultado = await publicador.publicarPendientes();
      return resultado.publicados === 1 ? resultado : null;
    }, 20_000);

    expect(await leerCola(cola)).toHaveLength(2);
    expect(
      await prisma.eventoSalidaFila.count({ where: { publicadoEn: null } }),
    ).toBe(0);
  });

  it('con el ciclo programado, publica solo cada OUTBOX_INTERVALO_MS', async () => {
    const cola = await crearCola();
    const publicador = nuevoPublicador(undefined, 200);
    publicador.onApplicationBootstrap();

    try {
      await registrar('ana@example.org');
      const mensajes = await esperarHasta(async () => {
        const leidos = await leerCola(cola);
        return leidos.length > 0 ? leidos : null;
      }, 10_000);

      expect(mensajes).toHaveLength(1);
    } finally {
      await publicador.onModuleDestroy();
    }
  });
});
