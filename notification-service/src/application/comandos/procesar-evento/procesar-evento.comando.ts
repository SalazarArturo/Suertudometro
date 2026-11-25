import { Command } from '@nestjs/cqrs';
import type { EventoIntegracion } from '../../eventos/evento-integracion.js';

/** Qué pasó con un evento: se aplicó, ya se había aplicado o espera a su campaña. */
export type ResultadoEvento = 'APLICADO' | 'DUPLICADO' | 'EN_ESPERA';

export class ProcesarEventoComando extends Command<ResultadoEvento> {
  constructor(readonly evento: EventoIntegracion) {
    super();
  }
}
