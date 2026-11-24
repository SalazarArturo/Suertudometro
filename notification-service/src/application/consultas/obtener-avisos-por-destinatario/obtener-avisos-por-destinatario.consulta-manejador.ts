import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { IdUsuario } from '../../../domain/identificadores/id-usuario.js';
import type { LectorAvisos } from '../../puertos/lector-avisos.js';
import { LECTOR_AVISOS } from '../../puertos/tokens-inyeccion.js';
import type { AvisoVista } from '../../vistas/aviso-vista.js';
import type { Pagina } from '../../vistas/pagina.js';
import { ObtenerAvisosPorDestinatarioConsulta } from './obtener-avisos-por-destinatario.consulta.js';

@QueryHandler(ObtenerAvisosPorDestinatarioConsulta)
export class ObtenerAvisosPorDestinatarioConsultaManejador implements IQueryHandler<ObtenerAvisosPorDestinatarioConsulta> {
  constructor(@Inject(LECTOR_AVISOS) private readonly lector: LectorAvisos) {}

  async execute(
    consulta: ObtenerAvisosPorDestinatarioConsulta,
  ): Promise<Pagina<AvisoVista>> {
    return this.lector.listar(
      IdUsuario.de(consulta.idDestinatario),
      consulta.filtro,
    );
  }
}
