import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  connect,
  type ConfirmChannel,
  type RecoveringChannelModel,
} from 'amqplib';
import {
  conLimiteDeTiempo,
  describirError,
  EXCHANGE_EVENTOS,
} from './topologia.js';

/**
 * Conexión de identity-service a RabbitMQ, con un canal de confirmaciones
 * (*publisher confirms*) para el publicador del outbox.
 *
 * - **Se reconecta sola.** amqplib reintenta con espera exponencial, de 1 a
 *   30 segundos (docs/servicios/identity-service.md §6). Mientras tanto, los
 *   eventos esperan en el outbox.
 * - **El canal se abre cuando hace falta** y se descarta si se cierra; el
 *   siguiente se abre sobre la conexión vigente y vuelve a declarar el exchange.
 * - **Sin `RABBITMQ_URL` no se conecta:** `canal()` devuelve `null`.
 */
@Injectable()
export class ConexionRabbitmq implements OnApplicationShutdown {
  private readonly registro = new Logger(ConexionRabbitmq.name);
  private readonly url: string | undefined;
  private conexion: Promise<RecoveringChannelModel> | null = null;
  private canalAbierto: Promise<ConfirmChannel> | null = null;
  private cerrada = false;

  constructor(configuracion: ConfigService) {
    this.url = configuracion.get<string>('RABBITMQ_URL');
  }

  /** Si hay una URL de RabbitMQ configurada. */
  get configurada(): boolean {
    return this.url !== undefined;
  }

  /**
   * Un canal listo para publicar, o `null` si ahora no hay conexión (todavía
   * conectando o reconectando). No espera más de `esperaMaxMs`: el canal que
   * quedó abriéndose se aprovecha en la siguiente llamada.
   */
  async canal(esperaMaxMs: number): Promise<ConfirmChannel | null> {
    if (this.url === undefined || this.cerrada) {
      return null;
    }
    this.conexion ??= this.iniciarConexion(this.url);
    this.canalAbierto ??= this.abrirCanal(this.conexion);
    try {
      return await conLimiteDeTiempo(this.canalAbierto, esperaMaxMs);
    } catch {
      return null;
    }
  }

  /** Cierra el canal y la conexión. Después de esto, `canal()` devuelve `null`. */
  async onApplicationShutdown(): Promise<void> {
    this.cerrada = true;
    const conexion = this.conexion;
    this.conexion = null;
    this.canalAbierto = null;
    if (conexion) {
      await conexion.then((modelo) => modelo.close()).catch(() => undefined);
    }
  }

  /** Empieza a conectar. Si ni siquiera puede empezar, lo intenta de nuevo en la siguiente llamada. */
  private iniciarConexion(url: string): Promise<RecoveringChannelModel> {
    const conexion = this.conectar(url);
    conexion.catch((error: unknown) => {
      this.registro.warn(
        `No se pudo iniciar la conexión con RabbitMQ: ${describirError(error)}`,
      );
      if (this.conexion === conexion) {
        this.conexion = null;
        this.canalAbierto = null;
      }
    });
    return conexion;
  }

  private async conectar(url: string): Promise<RecoveringChannelModel> {
    // waitForConnect: false. El servicio arranca aunque RabbitMQ no esté, y
    // los avisos de conexión quedan escuchados desde el primer intento.
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

  private abrirCanal(
    conexion: Promise<RecoveringChannelModel>,
  ): Promise<ConfirmChannel> {
    const abierto: Promise<ConfirmChannel> = conexion.then(async (modelo) => {
      const canal = await modelo.createConfirmChannel();
      // Sin este listener, un error del canal terminaría el proceso.
      canal.on('error', (error: Error) =>
        this.registro.warn(`Error en el canal de RabbitMQ: ${error.message}`),
      );
      canal.on('close', () => this.olvidarCanal(abierto));
      // Idempotente: si ya existe con los mismos argumentos, no hace nada.
      await canal.assertExchange(EXCHANGE_EVENTOS, 'topic', { durable: true });
      return canal;
    });
    abierto.catch((error: unknown) => {
      this.registro.warn(
        `No se pudo abrir el canal de RabbitMQ: ${describirError(error)}`,
      );
      this.olvidarCanal(abierto);
    });
    return abierto;
  }

  private olvidarCanal(canal: Promise<ConfirmChannel>): void {
    if (this.canalAbierto === canal) {
      this.canalAbierto = null;
    }
  }
}

interface ReconexionProgramada {
  attempt: number;
  delay: number;
  error: Error;
}
