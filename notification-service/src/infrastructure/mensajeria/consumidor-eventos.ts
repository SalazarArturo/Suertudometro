import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import {
  connect,
  type Channel,
  type ConsumeMessage,
  type RecoveringChannelModel,
} from 'amqplib';
import { ProcesarEventoComando } from '../../application/comandos/procesar-evento/procesar-evento.comando.js';
import { ErrorDeDominio } from '../../sharedkernel/error-de-dominio.js';
import { describirError } from '../errores.js';
import { leerMensaje, MensajeInvalido } from './lector-de-mensajes.js';
import { COLA, declararTopologia } from './topologia.js';

/** Esperas entre los reintentos de un error pasajero (docs/rabbitmq.md §5). */
export const ESPERAS_REINTENTO_MS: readonly number[] = [
  1_000, 2_000, 4_000, 8_000, 16_000,
];
/** Espera antes de volver a abrir un canal que se cerró. */
const ESPERA_REAPERTURA_MS = 2_000;

/**
 * Consume los eventos de los demás servicios (notification-service.md §6).
 *
 * - **De a uno** (`prefetch` 1), para respetar el orden de llegada.
 * - **`ack` después de guardar.** Un mensaje inválido va a la DLQ de inmediato;
 *   un error pasajero se reintenta con espera y, si no se recupera, también.
 * - **Se reconecta solo.** amqplib reintenta la conexión de 1 a 30 segundos; si
 *   solo se cierra el canal, se abre otro y se vuelve a declarar la topología.
 */
@Injectable()
export class ConsumidorEventos
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly registro = new Logger(ConsumidorEventos.name);
  private readonly url: string | undefined;
  private conexion: RecoveringChannelModel | null = null;
  private canal: Channel | null = null;
  private abriendo: Promise<void> | null = null;
  private reapertura: NodeJS.Timeout | null = null;
  private enCurso: Promise<void> | null = null;
  private readonly cierre = new AbortController();

  constructor(
    configuracion: ConfigService,
    private readonly comandos: CommandBus,
  ) {
    this.url = configuracion.get<string>('RABBITMQ_URL');
  }

  async onApplicationBootstrap(): Promise<void> {
    if (this.url === undefined) {
      this.registro.warn(
        'RABBITMQ_URL no está configurada: no se consumen eventos.',
      );
      return;
    }
    this.conexion = await this.conectar(this.url);
    this.asegurarCanal();
  }

  /** Deja de recibir y espera el mensaje en curso; lo que no tiene `ack` se reentrega. */
  async onModuleDestroy(): Promise<void> {
    this.cierre.abort();
    if (this.reapertura) {
      clearTimeout(this.reapertura);
    }
    await this.enCurso;
    const conexion = this.conexion;
    this.conexion = null;
    this.canal = null;
    await conexion?.close().catch(() => undefined);
  }

  private async conectar(url: string): Promise<RecoveringChannelModel> {
    // waitForConnect: false. El servicio arranca aunque RabbitMQ no esté.
    const conexion = await connect(url, {
      recovery: {
        initialDelay: 1_000,
        maxDelay: 30_000,
        waitForConnect: false,
      },
    });
    conexion.on('connect', () => this.registro.log('Conectado a RabbitMQ'));
    conexion.on('disconnect', (error: Error | undefined) =>
      this.registro.warn(
        `Se perdió la conexión con RabbitMQ: ${describirError(error)}`,
      ),
    );
    conexion.on(
      'reconnect-scheduled',
      ({ attempt, delay, error }: ReconexionProgramada) =>
        this.registro.warn(
          `No se pudo conectar a RabbitMQ (${describirError(error)}). Intento ${attempt} en ${Math.round(delay / 1000)} s`,
        ),
    );
    // Sin este listener, un error de la conexión terminaría el proceso.
    conexion.on('error', (error: Error) =>
      this.registro.warn(`Error de la conexión con RabbitMQ: ${error.message}`),
    );
    return conexion;
  }

  /** Abre el canal si no hay uno. `createChannel` espera a que haya conexión. */
  private asegurarCanal(): void {
    if (this.cierre.signal.aborted || this.canal || this.abriendo) {
      return;
    }
    this.abriendo = this.abrirCanal()
      .catch((error: unknown) => {
        if (!this.cierre.signal.aborted) {
          this.registro.warn(
            `No se pudo abrir el canal de RabbitMQ: ${describirError(error)}`,
          );
        }
        this.programarReapertura();
      })
      .finally(() => {
        this.abriendo = null;
      });
  }

  private async abrirCanal(): Promise<void> {
    const conexion = this.conexion;
    if (conexion === null) {
      return;
    }
    const canal = await conexion.createChannel();
    // Sin este listener, un error del canal terminaría el proceso.
    canal.on('error', (error: Error) =>
      this.registro.warn(`Error en el canal de RabbitMQ: ${error.message}`),
    );
    canal.on('close', () => {
      if (this.canal === canal) {
        this.canal = null;
      }
      this.programarReapertura();
    });
    this.canal = canal;
    await declararTopologia(canal);
    await canal.prefetch(1);
    await canal.consume(COLA, (mensaje) => this.recibir(canal, mensaje));
    this.registro.log(`Escuchando eventos en ${COLA}`);
  }

  private programarReapertura(): void {
    if (this.cierre.signal.aborted || this.reapertura) {
      return;
    }
    this.reapertura = setTimeout(() => {
      this.reapertura = null;
      this.asegurarCanal();
    }, ESPERA_REAPERTURA_MS);
  }

  private recibir(canal: Channel, mensaje: ConsumeMessage | null): void {
    if (mensaje === null) {
      // RabbitMQ canceló el consumo (por ejemplo, se borró la cola).
      this.registro.warn('RabbitMQ canceló el consumo: se vuelve a abrir.');
      canal.close().catch(() => undefined);
      return;
    }
    if (this.cierre.signal.aborted) {
      return;
    }
    this.enCurso = this.atender(canal, mensaje).finally(() => {
      this.enCurso = null;
    });
  }

  private async atender(
    canal: Channel,
    mensaje: ConsumeMessage,
  ): Promise<void> {
    const rutaDelMensaje = mensaje.fields.routingKey;
    try {
      const evento = leerMensaje(rutaDelMensaje, mensaje.content);
      const resultado = await this.procesar(new ProcesarEventoComando(evento));
      if (resultado === 'INTERRUMPIDO') {
        return;
      }
      this.registro.log(
        `${evento.tipo} ${evento.idEvento}: ${resultado.toLowerCase().replace('_', ' ')}`,
      );
      responder(() => canal.ack(mensaje));
    } catch (error) {
      // No se escribe el contenido del mensaje: puede traer correos o nombres.
      this.registro.error(
        `${rutaDelMensaje} va a la cola de errores: ${describirError(error)}`,
      );
      responder(() => canal.nack(mensaje, false, false));
    }
  }

  /** Reintenta los errores pasajeros. Los del mensaje no se arreglan esperando. */
  private async procesar(comando: ProcesarEventoComando) {
    for (let intento = 0; ; intento++) {
      try {
        return await this.comandos.execute(comando);
      } catch (error) {
        const espera = ESPERAS_REINTENTO_MS[intento];
        if (
          error instanceof ErrorDeDominio ||
          error instanceof MensajeInvalido ||
          espera === undefined
        ) {
          throw error;
        }
        this.registro.warn(
          `${comando.evento.tipo} ${comando.evento.idEvento} falló (${describirError(error)}). Reintento en ${espera / 1000} s`,
        );
        if (!(await esperar(espera, this.cierre.signal))) {
          return 'INTERRUMPIDO' as const;
        }
      }
    }
  }
}

/** Si el canal ya se cerró, el mensaje se reentrega y el inbox descarta el repetido. */
function responder(accion: () => void): void {
  try {
    accion();
  } catch {
    // Canal cerrado: no hay a quién responder.
  }
}

/** `false` si el servicio se está cerrando. */
function esperar(ms: number, senal: AbortSignal): Promise<boolean> {
  return new Promise((resolver) => {
    if (senal.aborted) {
      resolver(false);
      return;
    }
    const interrumpir = () => {
      clearTimeout(temporizador);
      resolver(false);
    };
    const temporizador = setTimeout(() => {
      senal.removeEventListener('abort', interrumpir);
      resolver(true);
    }, ms);
    senal.addEventListener('abort', interrumpir, { once: true });
  });
}

interface ReconexionProgramada {
  attempt: number;
  delay: number;
  error: Error;
}
