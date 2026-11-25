import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IdUsuario } from '../../../domain/identificadores/id-usuario.js';
import type { Reloj } from '../../puertos/reloj.js';
import { RELOJ, UNIDAD_DE_TRABAJO } from '../../puertos/tokens-inyeccion.js';
import type { UnidadDeTrabajo } from '../../puertos/unidad-de-trabajo.js';
import { MarcarAvisosLeidosComando } from './marcar-avisos-leidos.comando.js';

@CommandHandler(MarcarAvisosLeidosComando)
export class MarcarAvisosLeidosComandoManejador implements ICommandHandler<MarcarAvisosLeidosComando> {
  constructor(
    @Inject(UNIDAD_DE_TRABAJO) private readonly unidad: UnidadDeTrabajo,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async execute(comando: MarcarAvisosLeidosComando): Promise<void> {
    const idDestinatario = IdUsuario.de(comando.idDestinatario);
    await this.unidad.ejecutar((t) =>
      t.avisos.marcarTodosLeidos(idDestinatario, this.reloj.ahora()),
    );
  }
}
