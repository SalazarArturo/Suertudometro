import type { Aviso } from '../../domain/aviso/aviso.js';
import type { CampanaSeguida } from '../../domain/campana/campana-seguida.js';
import type { EventoDeCampanaConocida } from '../eventos/evento-integracion.js';
import { anteAporteRegistrado } from './ante-aporte-registrado.js';
import { anteCampanaActualizada } from './ante-campana-actualizada.js';
import { anteCampanaCerrada } from './ante-campana-cerrada.js';
import { anteMetaAlcanzada } from './ante-meta-alcanzada.js';

/** Elige la reacción que corresponde al evento. */
export function reaccionar(
  evento: EventoDeCampanaConocida,
  campana: CampanaSeguida,
  ahora: Date,
): Aviso[] {
  switch (evento.tipo) {
    case 'aporte.registrado':
      return anteAporteRegistrado(evento, campana, ahora);
    case 'meta.alcanzada':
      return anteMetaAlcanzada(evento, campana, ahora);
    case 'campana.actualizada':
      return anteCampanaActualizada(evento, campana, ahora);
    case 'campana.cerrada':
      return anteCampanaCerrada(evento, campana, ahora);
  }
}
