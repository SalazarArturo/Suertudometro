import {
  Inject,
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Reloj } from '../../application/puertos/reloj.js';
import { RELOJ } from '../../application/puertos/tokens-inyeccion.js';
import { PrismaServicio } from '../persistencia/prisma.servicio.js';
import { ConexionRabbitmq } from './conexion-rabbitmq.js';
import { publicarLote, type ResultadoEnvio } from './publicar-lote.js';
import { describirError } from './topologia.js';

/** Cuántos eventos toma el publicador en cada vuelta. */
export const TAMANO_LOTE = 50;
/** Cuánto espera un canal abierto antes de dar la vuelta por perdida. */
const ESPERA_CANAL_MS = 2_000;
/** Cuánto espera la confirmación de RabbitMQ de cada mensaje. */
const ESPERA_CONFIRMACION_MS = 10_000;
/** La espera entre vueltas que fallan no pasa de este tope. */
export const ESPERA_MAXIMA_MS = 30_000;

/** Lo que pasó en una vuelta del publicador. */
export interface ResultadoVuelta {
  /** No había canal: RabbitMQ no está o se está reconectando. */
  sinConexion: boolean;
  publicados: number;
  fallidos: number;
  /** El error del primer evento que no se pudo publicar. */
  primerError?: string;
}

/**
 * Espera antes de la siguiente vuelta: el intervalo normal, y si las últimas
 * vueltas fallaron, el doble por cada una, hasta 30 segundos. Así un RabbitMQ
 * caído o un evento sin cola no se reintentan cada 2 segundos.
 */
export function esperaSiguienteVuelta(
  intervaloMs: number,
  fallosSeguidos: number,
): number {
  return Math.min(intervaloMs * 2 ** fallosSeguidos, ESPERA_MAXIMA_MS);
}

/**
 * Relay del Transactional Outbox (docs/servicios/identity-service.md §6).
 * Cada `OUTBOX_INTERVALO_MS` toma hasta 50 eventos pendientes de
 * `eventos_salida`, los publica en `suertudometro.events` y los marca como
 * publicados cuando RabbitMQ los confirma.
 *
 * - **Al menos una vez:** si el servicio cae entre la confirmación y la marca,
 *   el evento se publica de nuevo con el mismo `idEvento`, y el consumidor lo
 *   descarta.
 * - **Sin conexión, no toca los eventos:** siguen pendientes y sin intentos
 *   sumados, hasta que vuelve la conexión.
 * - **`FOR UPDATE SKIP LOCKED`:** si algún día corren dos instancias, cada una
 *   toma eventos distintos.
 */
@Injectable()
export class PublicadorEventosSalida
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly registro = new Logger(PublicadorEventosSalida.name);
  private readonly intervaloMs: number;
  private temporizador: NodeJS.Timeout | null = null;
  private vueltaEnCurso: Promise<void> | null = null;
  private detenido = true;
  private fallosSeguidos = 0;
  /** El último aviso escrito en el log, para no repetirlo en cada vuelta. */
  private ultimoAviso: string | null = null;

  constructor(
    private readonly prisma: PrismaServicio,
    private readonly conexion: ConexionRabbitmq,
    configuracion: ConfigService,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {
    this.intervaloMs = configuracion.get<number>('OUTBOX_INTERVALO_MS', 2_000);
  }

  onApplicationBootstrap(): void {
    if (!this.conexion.configurada) {
      this.registro.warn(
        'RABBITMQ_URL no está configurada: los eventos se guardan en el outbox, pero no se publican.',
      );
      return;
    }
    this.detenido = false;
    this.programar(0);
  }

  /** Deja de programar vueltas y espera a que termine la que está en curso. */
  async onModuleDestroy(): Promise<void> {
    this.detenido = true;
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    await this.vueltaEnCurso;
  }

  /**
   * Una vuelta: publica hasta `TAMANO_LOTE` eventos pendientes, del más antiguo
   * al más nuevo. Las filas quedan bloqueadas en una transacción mientras se
   * publican, y en la misma transacción se marcan como publicadas o se les suma
   * un intento.
   */
  async publicarPendientes(): Promise<ResultadoVuelta> {
    const canal = await this.conexion.canal(ESPERA_CANAL_MS);
    if (!canal) {
      return { sinConexion: true, publicados: 0, fallidos: 0 };
    }

    return this.prisma.$transaction(
      async (tx) => {
        const bloqueados = await tx.$queryRaw<{ id_evento: string }[]>`
          SELECT id_evento FROM eventos_salida
          WHERE publicado_en IS NULL
          ORDER BY ocurrido_en, id_evento
          LIMIT ${TAMANO_LOTE}
          FOR UPDATE SKIP LOCKED`;
        if (bloqueados.length === 0) {
          return { sinConexion: false, publicados: 0, fallidos: 0 };
        }

        const filas = await tx.eventoSalidaFila.findMany({
          where: { idEvento: { in: bloqueados.map((f) => f.id_evento) } },
          orderBy: [{ ocurridoEn: 'asc' }, { idEvento: 'asc' }],
        });
        const resultados = await publicarLote(
          canal,
          filas.map((fila) => ({
            idEvento: fila.idEvento,
            tipoEvento: fila.tipoEvento,
            contenido: fila.contenido,
          })),
          ESPERA_CONFIRMACION_MS,
        );

        const publicados = resultados
          .filter((r) => r.publicado)
          .map((r) => r.idEvento);
        if (publicados.length > 0) {
          await tx.eventoSalidaFila.updateMany({
            where: { idEvento: { in: publicados } },
            data: { publicadoEn: this.reloj.ahora() },
          });
        }

        const fallidos = resultados.filter(
          (r): r is Extract<ResultadoEnvio, { publicado: false }> =>
            !r.publicado,
        );
        for (const [error, ids] of agruparPorError(fallidos)) {
          await tx.eventoSalidaFila.updateMany({
            where: { idEvento: { in: ids } },
            data: { intentos: { increment: 1 }, ultimoError: error },
          });
        }

        return {
          sinConexion: false,
          publicados: publicados.length,
          fallidos: fallidos.length,
          primerError: fallidos[0]?.error,
        };
      },
      // La transacción incluye la espera de las confirmaciones.
      { maxWait: 5_000, timeout: ESPERA_CONFIRMACION_MS + 20_000 },
    );
  }

  private programar(esperaMs: number): void {
    if (this.detenido) {
      return;
    }
    this.temporizador = setTimeout(() => {
      this.vueltaEnCurso = this.vuelta().finally(() => {
        this.vueltaEnCurso = null;
      });
    }, esperaMs);
  }

  private async vuelta(): Promise<void> {
    let resultado: ResultadoVuelta;
    try {
      resultado = await this.publicarPendientes();
    } catch (error) {
      // Por ejemplo, la base no responde: se intenta en la siguiente vuelta.
      resultado = {
        sinConexion: false,
        publicados: 0,
        fallidos: 0,
        primerError: `No se pudo leer el outbox: ${describirError(error)}`,
      };
    }
    this.informar(resultado);
    const bien = !resultado.sinConexion && resultado.primerError === undefined;
    this.fallosSeguidos = bien ? 0 : this.fallosSeguidos + 1;
    this.programar(
      esperaSiguienteVuelta(this.intervaloMs, this.fallosSeguidos),
    );
  }

  /** Escribe en el log lo publicado y cada problema nuevo, sin repetirlo. */
  private informar(resultado: ResultadoVuelta): void {
    if (resultado.publicados > 0) {
      this.registro.log(
        `${resultado.publicados} evento(s) publicado(s) en RabbitMQ`,
      );
    }

    let aviso: string | null = null;
    if (resultado.sinConexion) {
      aviso =
        'Sin conexión con RabbitMQ: los eventos esperan en el outbox hasta que vuelva.';
    } else if (resultado.primerError !== undefined) {
      aviso =
        resultado.fallidos > 0
          ? `${resultado.fallidos} evento(s) siguen pendientes: ${resultado.primerError}`
          : resultado.primerError;
    }

    if (aviso !== null && aviso !== this.ultimoAviso) {
      this.registro.warn(aviso);
    } else if (aviso === null && this.ultimoAviso !== null) {
      this.registro.log('El outbox vuelve a publicar con normalidad.');
    }
    this.ultimoAviso = aviso;
  }
}

function agruparPorError(
  fallidos: readonly { idEvento: string; error: string }[],
): Map<string, string[]> {
  const grupos = new Map<string, string[]>();
  for (const { idEvento, error } of fallidos) {
    grupos.set(error, [...(grupos.get(error) ?? []), idEvento]);
  }
  return grupos;
}
