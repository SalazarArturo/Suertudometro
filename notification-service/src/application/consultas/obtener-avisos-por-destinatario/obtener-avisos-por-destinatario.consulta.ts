import { Query } from '@nestjs/cqrs';
import type { FiltroAvisos } from '../../puertos/lector-avisos.js';
import type { AvisoVista } from '../../vistas/aviso-vista.js';
import type { Pagina } from '../../vistas/pagina.js';

/** La bandeja de una persona, del aviso más nuevo al más antiguo. */
export class ObtenerAvisosPorDestinatarioConsulta extends Query<
  Pagina<AvisoVista>
> {
  constructor(
    readonly idDestinatario: string,
    readonly filtro: FiltroAvisos,
  ) {
    super();
  }
}
