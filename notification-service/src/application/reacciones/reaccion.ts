import type { Aviso, OrigenAviso } from '../../domain/aviso/aviso.js';
import type { CampanaSeguida } from '../../domain/campana/campana-seguida.js';
import type {
  EventoDeCampanaConocida,
  EventoIntegracion,
} from '../eventos/evento-integracion.js';

/**
 * Qué hace el servicio ante un evento de una campaña conocida (Strategy): puede
 * cambiar la campaña y devuelve los avisos que produce. No guarda nada.
 */
export type Reaccion<TEvento extends EventoDeCampanaConocida> = (
  evento: TEvento,
  campana: CampanaSeguida,
  ahora: Date,
) => Aviso[];

/** El origen de los avisos que salen de un evento de esa campaña. */
export function origenDe(
  evento: EventoIntegracion,
  campana: CampanaSeguida,
): OrigenAviso {
  return {
    idEvento: evento.idEvento,
    ocurridoEn: evento.ocurridoEn,
    idCampana: campana.id,
  };
}
