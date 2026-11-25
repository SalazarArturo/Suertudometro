import type { IdUsuario } from '../../domain/identificadores/id-usuario.js';
import type { AvisoVista } from '../vistas/aviso-vista.js';
import type { Pagina } from '../vistas/pagina.js';

export interface FiltroAvisos {
  readonly soloNoLeidos: boolean;
  readonly pagina: number;
  readonly tamano: number;
}

/** Lado de lectura de la bandeja (CQRS): no reconstruye agregados. */
export interface LectorAvisos {
  listar(
    idDestinatario: IdUsuario,
    filtro: FiltroAvisos,
  ): Promise<Pagina<AvisoVista>>;

  contarNoLeidos(idDestinatario: IdUsuario): Promise<number>;
}
