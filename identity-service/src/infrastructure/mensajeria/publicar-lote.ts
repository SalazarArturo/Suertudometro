import type { Message, Options } from 'amqplib';
import {
  conLimiteDeTiempo,
  describirError,
  EXCHANGE_EVENTOS,
} from './topologia.js';

/** Un evento del outbox listo para salir al bus. */
export interface MensajeSalida {
  idEvento: string;
  /** También es la routing key (docs/rabbitmq.md §4). */
  tipoEvento: string;
  /** El envelope completo, tal como se guardó en `eventos_salida`. */
  contenido: unknown;
}

export type ResultadoEnvio =
  | { idEvento: string; publicado: true }
  | { idEvento: string; publicado: false; error: string };

/**
 * Lo que el lote necesita de un canal de confirmaciones. El `ConfirmChannel`
 * de amqplib lo cumple; las pruebas usan un doble.
 */
export interface CanalConfirmado {
  publish(
    exchange: string,
    routingKey: string,
    content: Buffer,
    options: Options.Publish,
    callback: (error: unknown) => void,
  ): boolean;
  on(evento: 'return', escucha: (mensaje: Message) => void): unknown;
  off(evento: 'return', escucha: (mensaje: Message) => void): unknown;
}

/**
 * Propiedades de todo mensaje (docs/rabbitmq.md §4). `mandatory`: si ninguna
 * cola recibe el evento, RabbitMQ lo devuelve en lugar de descartarlo, y el
 * evento queda pendiente en el outbox hasta que su consumidor cree la cola.
 */
const PROPIEDADES: Options.Publish = {
  persistent: true,
  contentType: 'application/json',
  contentEncoding: 'utf-8',
  mandatory: true,
};

/**
 * Publica los mensajes y espera la confirmación de RabbitMQ de cada uno.
 * Devuelve un resultado por mensaje, en el mismo orden. Un mensaje cuenta como
 * publicado solo si RabbitMQ lo confirmó y no lo devolvió.
 */
export async function publicarLote(
  canal: CanalConfirmado,
  mensajes: readonly MensajeSalida[],
  esperaMaxMs: number,
): Promise<ResultadoEnvio[]> {
  // RabbitMQ manda la devolución antes que la confirmación del mismo mensaje.
  const devueltos = new Map<string, string>();
  const alDevolver = (mensaje: Message) => {
    const idEvento: unknown = mensaje.properties.messageId;
    if (typeof idEvento === 'string') {
      devueltos.set(idEvento, motivoDevolucion(mensaje));
    }
  };

  canal.on('return', alDevolver);
  try {
    return await Promise.all(
      mensajes.map((mensaje) =>
        publicarUno(canal, mensaje, devueltos, esperaMaxMs),
      ),
    );
  } finally {
    canal.off('return', alDevolver);
  }
}

function publicarUno(
  canal: CanalConfirmado,
  mensaje: MensajeSalida,
  devueltos: ReadonlyMap<string, string>,
  esperaMaxMs: number,
): Promise<ResultadoEnvio> {
  const { idEvento, tipoEvento } = mensaje;
  const confirmado = new Promise<ResultadoEnvio>((resolver) => {
    try {
      canal.publish(
        EXCHANGE_EVENTOS,
        tipoEvento,
        Buffer.from(JSON.stringify(mensaje.contenido), 'utf8'),
        { ...PROPIEDADES, messageId: idEvento, type: tipoEvento },
        (error) => {
          if (error) {
            resolver(
              fallo(
                idEvento,
                `RabbitMQ no lo confirmó: ${describirError(error)}`,
              ),
            );
          } else if (devueltos.has(idEvento)) {
            resolver(
              fallo(
                idEvento,
                `Ninguna cola recibe ${tipoEvento} (${devueltos.get(idEvento)}). Queda pendiente hasta que su consumidor cree la cola.`,
              ),
            );
          } else {
            resolver({ idEvento, publicado: true });
          }
        },
      );
    } catch (error) {
      // Por ejemplo, el canal se cerró justo antes de publicar.
      resolver(
        fallo(idEvento, `No se pudo publicar: ${describirError(error)}`),
      );
    }
  });
  return conLimiteDeTiempo(confirmado, esperaMaxMs).catch(() =>
    fallo(idEvento, `RabbitMQ no lo confirmó en ${esperaMaxMs} ms`),
  );
}

function fallo(idEvento: string, error: string): ResultadoEnvio {
  return { idEvento, publicado: false, error };
}

function motivoDevolucion(mensaje: Message): string {
  // amqplib entrega el replyText de la devolución entre los campos del mensaje.
  const campos = mensaje.fields as { replyText?: unknown };
  return typeof campos.replyText === 'string' ? campos.replyText : 'devuelto';
}
