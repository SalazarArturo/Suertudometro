import type { Channel } from 'amqplib';
import type { TipoEvento } from '../../application/eventos/evento-integracion.js';

// Nombres de docs/rabbitmq.md §2.
export const SERVICIO = 'notification-service';
export const EXCHANGE_EVENTOS = 'suertudometro.events';
export const EXCHANGE_ERRORES = 'suertudometro.events.dlx';
export const COLA = `${SERVICIO}.avisos`;
export const COLA_ERRORES = `${SERVICIO}.dlq`;

/** Los eventos que escucha este servicio (notification-service.md §6). */
export const TIPOS_CONSUMIDOS: readonly TipoEvento[] = [
  'usuario.registrado',
  'campana.publicada',
  'campana.rechazada',
  'aporte.registrado',
  'meta.alcanzada',
  'campana.actualizada',
  'campana.cerrada',
];

/** Declara lo que usa el servicio. Si ya existe con los mismos argumentos, no hace nada. */
export async function declararTopologia(canal: Channel): Promise<void> {
  await canal.assertExchange(EXCHANGE_EVENTOS, 'topic', { durable: true });
  await canal.assertExchange(EXCHANGE_ERRORES, 'direct', { durable: true });

  await canal.assertQueue(COLA_ERRORES, { durable: true });
  await canal.bindQueue(COLA_ERRORES, EXCHANGE_ERRORES, SERVICIO);

  await canal.assertQueue(COLA, {
    durable: true,
    deadLetterExchange: EXCHANGE_ERRORES,
    deadLetterRoutingKey: SERVICIO,
  });
  for (const tipo of TIPOS_CONSUMIDOS) {
    await canal.bindQueue(COLA, EXCHANGE_EVENTOS, tipo);
  }
}
