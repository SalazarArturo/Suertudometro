import { Command } from '@nestjs/cqrs';

/** Lo que pasó en una vuelta del despachador. */
export interface ResultadoEnvios {
  readonly enviados: number;
  /** Los que el servidor de correo rechazó en esta vuelta. */
  readonly fallidos: number;
  /** El servidor de correo no respondió: la vuelta se cortó. */
  readonly sinServidor: boolean;
  readonly primerError?: string;
}

export class EnviarCorreosPendientesComando extends Command<ResultadoEnvios> {}
