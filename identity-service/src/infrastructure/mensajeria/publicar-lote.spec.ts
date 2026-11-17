import { EventEmitter } from 'node:events';
import type { Message, Options } from 'amqplib';
import {
  type CanalConfirmado,
  type MensajeSalida,
  publicarLote,
} from './publicar-lote.js';

/** Cómo responde el doble del canal a cada mensaje. */
type Respuesta = 'confirma' | 'rechaza' | 'devuelve' | 'lanza' | 'no-responde';

interface Publicacion {
  exchange: string;
  routingKey: string;
  cuerpo: string;
  propiedades: Options.Publish;
}

/**
 * Doble de un ConfirmChannel de amqplib. Responde de forma asíncrona, como el
 * broker, y en una devolución emite `return` antes de confirmar, igual que
 * RabbitMQ.
 */
class CanalFalso extends EventEmitter implements CanalConfirmado {
  readonly publicaciones: Publicacion[] = [];

  constructor(
    private readonly respuesta: (idEvento: string) => Respuesta = () =>
      'confirma',
  ) {
    super();
  }

  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: Options.Publish,
    callback: (error: unknown) => void,
  ): boolean {
    const idEvento = String(options.messageId);
    const respuesta = this.respuesta(idEvento);
    if (respuesta === 'lanza') {
      throw new Error('Channel closed');
    }
    this.publicaciones.push({
      exchange,
      routingKey,
      cuerpo: content.toString('utf8'),
      propiedades: options,
    });
    queueMicrotask(() => {
      if (respuesta === 'confirma') {
        callback(null);
      } else if (respuesta === 'rechaza') {
        callback(new Error('message nacked'));
      } else if (respuesta === 'devuelve') {
        const devuelto = {
          content,
          fields: {
            replyCode: 312,
            replyText: 'NO_ROUTE',
            exchange,
            routingKey,
          },
          properties: { messageId: idEvento },
        } as unknown as Message;
        this.emit('return', devuelto);
        callback(null);
      }
      // 'no-responde': nunca confirma.
    });
    return true;
  }
}

function mensaje(idEvento: string): MensajeSalida {
  return {
    idEvento,
    tipoEvento: 'usuario.registrado',
    contenido: {
      idEvento,
      tipoEvento: 'usuario.registrado',
      version: 1,
      ocurridoEn: '2026-11-07T14:00:00.000Z',
      datos: { idUsuario: 'u-1', correo: 'begoña@example.org' },
    },
  };
}

describe('publicarLote', () => {
  it('publica en suertudometro.events, con el tipo como routing key y las propiedades del contrato', async () => {
    const canal = new CanalFalso();
    const evento = mensaje('e-1');

    const resultados = await publicarLote(canal, [evento], 1_000);

    expect(resultados).toEqual([{ idEvento: 'e-1', publicado: true }]);
    const [publicacion] = canal.publicaciones;
    expect(publicacion.exchange).toBe('suertudometro.events');
    expect(publicacion.routingKey).toBe('usuario.registrado');
    expect(JSON.parse(publicacion.cuerpo)).toEqual(evento.contenido);
    expect(publicacion.propiedades).toMatchObject({
      persistent: true,
      contentType: 'application/json',
      contentEncoding: 'utf-8',
      messageId: 'e-1',
      type: 'usuario.registrado',
      mandatory: true,
    });
  });

  it('conserva las tildes y la ñ del envelope (UTF-8)', async () => {
    const canal = new CanalFalso();

    await publicarLote(canal, [mensaje('e-1')], 1_000);

    expect(canal.publicaciones[0].cuerpo).toContain('begoña@example.org');
  });

  it('si RabbitMQ no confirma el mensaje, queda como no publicado', async () => {
    const canal = new CanalFalso(() => 'rechaza');

    const [resultado] = await publicarLote(canal, [mensaje('e-1')], 1_000);

    expect(resultado).toEqual({
      idEvento: 'e-1',
      publicado: false,
      error: 'RabbitMQ no lo confirmó: message nacked',
    });
  });

  it('si ninguna cola recibe el evento, RabbitMQ lo devuelve y queda como no publicado', async () => {
    const canal = new CanalFalso(() => 'devuelve');

    const [resultado] = await publicarLote(canal, [mensaje('e-1')], 1_000);

    expect(resultado.publicado).toBe(false);
    expect(resultado).toMatchObject({
      error: expect.stringMatching(
        /^Ninguna cola recibe usuario\.registrado \(NO_ROUTE\)/,
      ) as unknown,
    });
  });

  it('si el canal está cerrado, queda como no publicado', async () => {
    const canal = new CanalFalso(() => 'lanza');

    const [resultado] = await publicarLote(canal, [mensaje('e-1')], 1_000);

    expect(resultado).toEqual({
      idEvento: 'e-1',
      publicado: false,
      error: 'No se pudo publicar: Channel closed',
    });
  });

  it('si RabbitMQ no responde a tiempo, queda como no publicado', async () => {
    const canal = new CanalFalso(() => 'no-responde');

    const [resultado] = await publicarLote(canal, [mensaje('e-1')], 50);

    expect(resultado).toEqual({
      idEvento: 'e-1',
      publicado: false,
      error: 'RabbitMQ no lo confirmó en 50 ms',
    });
  });

  it('en un lote mixto, cada mensaje tiene su resultado, en el mismo orden', async () => {
    const respuestas: Record<string, Respuesta> = {
      'e-1': 'confirma',
      'e-2': 'devuelve',
      'e-3': 'confirma',
      'e-4': 'rechaza',
    };
    const canal = new CanalFalso((id) => respuestas[id]);

    const resultados = await publicarLote(
      canal,
      Object.keys(respuestas).map(mensaje),
      1_000,
    );

    expect(resultados.map((r) => [r.idEvento, r.publicado])).toEqual([
      ['e-1', true],
      ['e-2', false],
      ['e-3', true],
      ['e-4', false],
    ]);
  });

  it('al terminar, deja de escuchar las devoluciones del canal', async () => {
    const canal = new CanalFalso();

    await publicarLote(canal, [mensaje('e-1'), mensaje('e-2')], 1_000);

    expect(canal.listenerCount('return')).toBe(0);
  });
});
