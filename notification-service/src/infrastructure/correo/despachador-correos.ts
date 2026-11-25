import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import {
  EnviarCorreosPendientesComando,
  type ResultadoEnvios,
} from '../../application/comandos/enviar-correos-pendientes/enviar-correos-pendientes.comando.js';
import { describirError } from '../errores.js';

/** La espera entre vueltas que fallan no pasa de este tope. */
export const ESPERA_MAXIMA_MS = 30_000;

/** El intervalo normal, y el doble por cada vuelta seguida que falla, hasta 30 s. */
export function esperaSiguienteVuelta(
  intervaloMs: number,
  fallosSeguidos: number,
): number {
  return Math.min(intervaloMs * 2 ** fallosSeguidos, ESPERA_MAXIMA_MS);
}

/** Cada `CORREO_INTERVALO_MS` envía los correos pendientes (notification-service.md §6). */
@Injectable()
export class DespachadorCorreos
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly registro = new Logger(DespachadorCorreos.name);
  private readonly configurado: boolean;
  private readonly intervaloMs: number;
  private temporizador: NodeJS.Timeout | null = null;
  private vueltaEnCurso: Promise<void> | null = null;
  private detenido = true;
  private fallosSeguidos = 0;
  /** El último aviso escrito en el log, para no repetirlo en cada vuelta. */
  private ultimoAviso: string | null = null;

  constructor(
    configuracion: ConfigService,
    private readonly comandos: CommandBus,
  ) {
    this.configurado = configuracion.get<string>('SMTP_HOST') !== undefined;
    this.intervaloMs = configuracion.get<number>('CORREO_INTERVALO_MS', 2_000);
  }

  onApplicationBootstrap(): void {
    if (!this.configurado) {
      this.registro.warn(
        'SMTP_HOST no está configurado: los avisos llegan a la bandeja y sus correos quedan pendientes.',
      );
      return;
    }
    this.detenido = false;
    this.programar(0);
  }

  async onModuleDestroy(): Promise<void> {
    this.detenido = true;
    if (this.temporizador) {
      clearTimeout(this.temporizador);
      this.temporizador = null;
    }
    await this.vueltaEnCurso;
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
    let resultado: ResultadoEnvios;
    let problema: string | null;
    try {
      resultado = await this.comandos.execute(
        new EnviarCorreosPendientesComando(),
      );
      problema = resultado.sinServidor
        ? (resultado.primerError ?? 'El servidor de correo no responde')
        : null;
    } catch (error) {
      // Por ejemplo, la base no responde: se intenta en la siguiente vuelta.
      resultado = { enviados: 0, fallidos: 0, sinServidor: false };
      problema = `No se pudieron revisar los correos: ${describirError(error)}`;
    }
    this.informar(resultado, problema);
    this.fallosSeguidos = problema === null ? 0 : this.fallosSeguidos + 1;
    this.programar(
      esperaSiguienteVuelta(this.intervaloMs, this.fallosSeguidos),
    );
  }

  private informar(resultado: ResultadoEnvios, problema: string | null): void {
    if (resultado.enviados > 0) {
      this.registro.log(`${resultado.enviados} correo(s) enviado(s)`);
    }
    if (resultado.fallidos > 0) {
      this.registro.warn(
        `${resultado.fallidos} correo(s) rechazado(s), se reintentan: ${resultado.primerError}`,
      );
    }
    if (problema !== null && problema !== this.ultimoAviso) {
      this.registro.warn(problema);
    } else if (problema === null && this.ultimoAviso !== null) {
      this.registro.log('El correo vuelve a funcionar.');
    }
    this.ultimoAviso = problema;
  }
}
