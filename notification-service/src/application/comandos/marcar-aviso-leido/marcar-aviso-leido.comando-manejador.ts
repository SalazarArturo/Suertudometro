import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { IdAviso } from '../../../domain/identificadores/id-aviso.js';
import { IdUsuario } from '../../../domain/identificadores/id-usuario.js';
import { AvisoNoEncontrado } from '../../errores/aviso-no-encontrado.js';
import type { Reloj } from '../../puertos/reloj.js';
import { RELOJ, UNIDAD_DE_TRABAJO } from '../../puertos/tokens-inyeccion.js';
import type { UnidadDeTrabajo } from '../../puertos/unidad-de-trabajo.js';
import { MarcarAvisoLeidoComando } from './marcar-aviso-leido.comando.js';

@CommandHandler(MarcarAvisoLeidoComando)
export class MarcarAvisoLeidoComandoManejador implements ICommandHandler<MarcarAvisoLeidoComando> {
  constructor(
    @Inject(UNIDAD_DE_TRABAJO) private readonly unidad: UnidadDeTrabajo,
    @Inject(RELOJ) private readonly reloj: Reloj,
  ) {}

  async execute(comando: MarcarAvisoLeidoComando): Promise<void> {
    const idDestinatario = IdUsuario.de(comando.idDestinatario);
    const idAviso = IdAviso.de(comando.idAviso);
    await this.unidad.ejecutar(async (t) => {
      const aviso = await t.avisos.buscarDe(idDestinatario, idAviso);
      if (aviso === null) {
        throw new AvisoNoEncontrado(comando.idAviso);
      }
      aviso.marcarLeido(this.reloj.ahora());
      await t.avisos.guardarLectura(aviso);
    });
  }
}
