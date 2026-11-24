import { Command } from '@nestjs/cqrs';

export class MarcarAvisoLeidoComando extends Command<void> {
  constructor(
    readonly idDestinatario: string,
    readonly idAviso: string,
  ) {
    super();
  }
}
