import { Command } from '@nestjs/cqrs';

/** Marca como leídos todos los avisos de una persona. */
export class MarcarAvisosLeidosComando extends Command<void> {
  constructor(readonly idDestinatario: string) {
    super();
  }
}
