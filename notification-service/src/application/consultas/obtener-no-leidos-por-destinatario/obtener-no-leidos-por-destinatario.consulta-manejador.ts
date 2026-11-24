import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IdUsuario } from '../../../domain/identificadores/id-usuario.js';
import type { LectorAvisos } from '../../puertos/lector-avisos.js';
import { LECTOR_AVISOS } from '../../puertos/tokens-inyeccion.js';
import { ObtenerNoLeidosPorDestinatarioConsulta } from './obtener-no-leidos-por-destinatario.consulta.js';

@QueryHandler(ObtenerNoLeidosPorDestinatarioConsulta)
export class ObtenerNoLeidosPorDestinatarioConsultaManejador implements IQueryHandler<ObtenerNoLeidosPorDestinatarioConsulta> {
  constructor(@Inject(LECTOR_AVISOS) private readonly lector: LectorAvisos) {}

  async execute(
    consulta: ObtenerNoLeidosPorDestinatarioConsulta,
  ): Promise<number> {
    return this.lector.contarNoLeidos(IdUsuario.de(consulta.idDestinatario));
  }
}
