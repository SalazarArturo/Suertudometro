import { randomUUID } from 'node:crypto';
import { type INestApplicationContext, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { NestFactory } from '@nestjs/core';
import {
  RabbitMQContainer,
  type StartedRabbitMQContainer,
} from '@testcontainers/rabbitmq';
import { connect, type Channel, type ChannelModel } from 'amqplib';
import { inject } from 'vitest';
import type { EventoIntegracion } from '../../../src/application/eventos/evento-integracion.js';
import type { PrismaServicio } from '../../../src/infrastructure/persistencia/prisma.servicio.js';
import { esperarHasta } from '../../ayudas/esperar-hasta.js';
import { MailpitDePrueba } from '../../ayudas/mailpit.js';
import { aSobre } from '../../ayudas/sobres.js';
import { crearPrisma, vaciarTablas } from '../../base-datos/base-datos.js';
import {
  ANA,
  aporteAnonimo,
  aporteRegistrado,
  BETO,
  campanaActualizada,
  campanaCerrada,
  campanaPublicada,
  campanaRechazada,
  metaAlcanzada,
  OLGA,
  usuarioRegistrado,
} from '../../dobles/eventos.js';

const EXCHANGE = 'suertudometro.events';
const COLA = 'notification-service.avisos';
const DLQ = 'notification-service.dlq';

/** El servicio real, con PostgreSQL 18, RabbitMQ 4.3 y Mailpit reales. */
describe('notification-service de punta a punta', () => {
  let rabbit: StartedRabbitMQContainer;
  let mailpit: MailpitDePrueba;
  let prisma: PrismaServicio;
  let app: INestApplicationContext;
  // Cliente de la prueba: hace de los demás servicios.
  let cliente: ChannelModel;
  let canal: Channel;

  beforeAll(async () => {
    [rabbit, mailpit] = await Promise.all([
      new RabbitMQContainer('rabbitmq:4.3-alpine').start(),
      MailpitDePrueba.iniciar(),
    ]);
    prisma = crearPrisma();
    await abrirCliente();
    for (const nivel of ['log', 'warn', 'error'] as const) {
      vi.spyOn(Logger.prototype, nivel).mockImplementation(() => {});
    }
    app = await iniciarServicio();
    await esperarConsumidor();
  });

  afterAll(async () => {
    await app?.close();
    vi.restoreAllMocks();
    await cliente?.close().catch(() => undefined);
    await prisma?.$disconnect();
    await Promise.all([rabbit?.stop(), mailpit?.detener()]);
  });

  beforeEach(async () => {
    await vaciarTablas(prisma);
    await canal.purgeQueue(DLQ);
    await mailpit.vaciar();
  });

  async function abrirCliente(): Promise<void> {
    cliente = await connect(rabbit.getAmqpUrl());
    cliente.on('error', () => undefined);
    canal = await cliente.createChannel();
    canal.on('error', () => undefined);
  }

  async function iniciarServicio(): Promise<INestApplicationContext> {
    Object.assign(process.env, {
      DATABASE_URL: inject('urlBaseDatos'),
      RABBITMQ_URL: rabbit.getAmqpUrl(),
      SMTP_HOST: mailpit.host,
      SMTP_PUERTO: String(mailpit.puertoSmtp),
      CORREO_INTERVALO_MS: '200',
    });
    // El módulo valida process.env en cuanto se importa.
    const { NotificacionesModulo } =
      await import('../../../src/notificaciones.modulo.js');
    return NestFactory.createApplicationContext(NotificacionesModulo, {
      logger: false,
    });
  }

  const esperarConsumidor = () =>
    esperarHasta(async () => {
      const sonda = await cliente.createChannel();
      sonda.on('error', () => undefined);
      try {
        const { consumerCount } = await sonda.checkQueue(COLA);
        await sonda.close();
        return consumerCount === 1 ? true : null;
      } catch {
        return null; // la cola todavía no existe
      }
    }, 30_000);

  function publicarSobre(routingKey: string, mensaje: unknown): void {
    const contenido =
      typeof mensaje === 'string' ? mensaje : JSON.stringify(mensaje);
    canal.publish(EXCHANGE, routingKey, Buffer.from(contenido), {
      persistent: true,
    });
  }

  const publicar = (...eventos: EventoIntegracion[]) => {
    for (const evento of eventos) {
      publicarSobre(evento.tipo, aSobre(evento));
    }
  };

  const correos = (cantidad: number, ms?: number) =>
    esperarHasta(async () => {
      const lista = await mailpit.correos();
      return lista.length >= cantidad ? lista : null;
    }, ms);

  const enDlq = (cantidad: number, ms?: number) =>
    esperarHasta(async () => {
      const { messageCount } = await canal.checkQueue(DLQ);
      return messageCount >= cantidad ? messageCount : null;
    }, ms);

  const procesados = (cantidad: number) =>
    esperarHasta(async () =>
      (await prisma.eventoProcesadoFila.count()) >= cantidad ? true : null,
    );

  it('declara su cola, su DLQ y los siete enlaces, todo durable', async () => {
    const salida = await rabbit.exec([
      'rabbitmqctl',
      '-q',
      'list_bindings',
      'source_name',
      'destination_name',
      'routing_key',
    ]);
    const enlaces = salida.output
      .split('\n')
      .map((linea) => linea.trim().split('\t'))
      .filter(([origen]) => origen.startsWith('suertudometro'));
    expect(enlaces.map((enlace) => enlace.join(' ')).sort()).toEqual(
      [
        ...[
          'aporte.registrado',
          'campana.actualizada',
          'campana.cerrada',
          'campana.publicada',
          'campana.rechazada',
          'meta.alcanzada',
          'usuario.registrado',
        ].map((clave) => `${EXCHANGE} ${COLA} ${clave}`),
        `${EXCHANGE}.dlx ${DLQ} notification-service`,
      ].sort(),
    );
    const colas = await rabbit.exec([
      'rabbitmqctl',
      '-q',
      'list_queues',
      'name',
      'durable',
      'arguments',
    ]);
    const propia = colas.output.split('\n').find((l) => l.startsWith(COLA));
    expect(propia).toContain('true');
    expect(propia).toContain('suertudometro.events.dlx');
  });

  it('del evento al correo: cada persona recibe lo suyo', async () => {
    publicar(
      usuarioRegistrado(OLGA, 'olga@example.org'),
      usuarioRegistrado(ANA, 'ana@example.org'),
      usuarioRegistrado(BETO, 'beto@example.org'),
      campanaPublicada(),
      aporteRegistrado(),
      aporteAnonimo(BETO, 3),
      campanaActualizada(),
      metaAlcanzada(),
      campanaCerrada('META_ALCANZADA'),
    );

    const recibidos = await correos(8);
    // Un momento más, por si llegara alguno de sobra.
    await new Promise((resolver) => setTimeout(resolver, 1_500));
    expect(await mailpit.correos()).toHaveLength(8);

    const para = (correo: string) =>
      recibidos
        .filter((c) => c.To[0].Address === correo)
        .map((c) => c.Subject)
        .sort();
    expect(para('olga@example.org')).toEqual([
      'Recibiste un aporte de Bs 150,00',
      'Recibiste un aporte de Bs 150,00',
      'Tu campaña alcanzó su meta',
      'Tu campaña ya está publicada',
    ]);
    const apoyo = [
      'Novedad en «Libros para la biblioteca»',
      'Una campaña que apoyaste alcanzó su meta',
    ];
    expect(para('ana@example.org')).toEqual(apoyo);
    expect(para('beto@example.org')).toEqual(apoyo);

    // R2: en lo que recibe Olga no hay rastro de Beto, que aportó como anónimo.
    for (const correo of recibidos.filter(
      (c) => c.To[0].Address === 'olga@example.org',
    )) {
      const { Text, HTML } = await mailpit.cuerpo(correo.ID);
      expect(Text + HTML).not.toContain('beto');
      expect(Text + HTML).not.toContain(BETO);
    }
    expect((await canal.checkQueue(DLQ)).messageCount).toBe(0);
  });

  it('el rechazo y la cancelación también llegan', async () => {
    publicar(
      usuarioRegistrado(OLGA, 'olga@example.org'),
      campanaRechazada(),
      campanaPublicada(),
      campanaCerrada('CANCELACION'),
    );
    const asuntos = (await correos(3)).map((c) => c.Subject).sort();
    expect(asuntos).toEqual([
      'Tu campaña fue cancelada',
      'Tu campaña necesita cambios',
      'Tu campaña ya está publicada',
    ]);
  });

  it('si el contacto llega después, el correo sale igual', async () => {
    publicar(campanaPublicada());
    await procesados(1);
    expect(await mailpit.correos()).toHaveLength(0);
    publicar(usuarioRegistrado(OLGA, 'olga@example.org'));
    expect((await correos(1))[0].Subject).toBe('Tu campaña ya está publicada');
  });

  it('lo que llega antes que la campaña espera y después se avisa', async () => {
    publicar(
      usuarioRegistrado(OLGA, 'olga@example.org'),
      aporteRegistrado(),
      campanaPublicada(),
    );
    expect((await correos(2)).map((c) => c.Subject).sort()).toEqual([
      'Recibiste un aporte de Bs 150,00',
      'Tu campaña ya está publicada',
    ]);
  });

  it('un evento reentregado no repite el correo', async () => {
    const publicada = campanaPublicada();
    publicar(usuarioRegistrado(OLGA, 'olga@example.org'), publicada, publicada);
    await correos(1);
    publicar(publicada);
    await new Promise((resolver) => setTimeout(resolver, 1_500));
    expect(await mailpit.correos()).toHaveLength(1);
  });

  it('un mensaje inválido va a la DLQ sin frenar a los demás', async () => {
    publicarSobre('campana.publicada', '{roto');
    publicarSobre('campana.publicada', {
      ...aSobre(campanaPublicada()),
      version: 99,
    });
    publicarSobre('aporte.registrado', {
      idEvento: randomUUID(),
      tipoEvento: 'aporte.registrado',
      version: 1,
      ocurridoEn: new Date().toISOString(),
      datos: { monto: 150 },
    });
    publicar(usuarioRegistrado(OLGA, 'olga@example.org'), campanaPublicada());

    await correos(1);
    expect(await enDlq(3)).toBe(3);
    expect((await canal.checkQueue(COLA)).messageCount).toBe(0);
  });

  it('un error pasajero se reintenta y el mensaje no se pierde', async () => {
    const bus = app.get(CommandBus);
    const ejecutar = vi
      .spyOn(bus, 'execute')
      .mockRejectedValueOnce(new Error('la base no responde'));
    publicar(usuarioRegistrado(OLGA, 'olga@example.org'));
    await procesados(1);
    ejecutar.mockRestore();
    expect((await canal.checkQueue(DLQ)).messageCount).toBe(0);
  });

  it('un error que no se recupera termina en la DLQ tras los reintentos', async () => {
    const bus = app.get(CommandBus);
    const original = bus.execute.bind(bus);
    const ejecutar = vi
      .spyOn(bus, 'execute')
      .mockImplementation((comando) =>
        'evento' in comando
          ? Promise.reject(new Error('sigue sin responder'))
          : original(comando),
      );
    try {
      publicar(usuarioRegistrado(OLGA, 'olga@example.org'));
      expect(await enDlq(1, 50_000)).toBe(1);
    } finally {
      ejecutar.mockRestore();
    }
    // Y sigue atendiendo.
    publicar(usuarioRegistrado(ANA, 'ana@example.org'));
    await procesados(1);
  }, 70_000);

  it('si RabbitMQ cierra la conexión, se reconecta y sigue', async () => {
    const cierre = await rabbit.exec([
      'rabbitmqctl',
      'close_all_connections',
      'prueba de reconexion',
    ]);
    expect(cierre.exitCode).toBe(0);
    await abrirCliente();
    await esperarConsumidor();
    publicar(usuarioRegistrado(OLGA, 'olga@example.org'), campanaPublicada());
    await correos(1, 30_000);
  }, 60_000);

  it('si se borra su cola, la vuelve a declarar y sigue', async () => {
    await canal.deleteQueue(COLA);
    await esperarConsumidor();
    publicar(usuarioRegistrado(OLGA, 'olga@example.org'), campanaPublicada());
    await correos(1, 30_000);
  }, 60_000);

  it('al cerrarse en medio de un reintento, el mensaje vuelve a la cola y lo atiende el siguiente', async () => {
    const bus = app.get(CommandBus);
    vi.spyOn(bus, 'execute').mockRejectedValue(new Error('cerrando'));
    publicar(usuarioRegistrado(OLGA, 'olga@example.org'), campanaPublicada());
    await new Promise((resolver) => setTimeout(resolver, 500));
    await app.close();
    expect(await prisma.eventoProcesadoFila.count()).toBe(0);
    expect((await canal.checkQueue(DLQ)).messageCount).toBe(0);

    app = await iniciarServicio();
    expect((await correos(1, 30_000))[0].Subject).toBe(
      'Tu campaña ya está publicada',
    );
  }, 60_000);
});
