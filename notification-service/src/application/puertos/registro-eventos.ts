import type { IdCampana } from '../../domain/identificadores/id-campana.js';
import type {
  EventoDeCampanaConocida,
  EventoIntegracion,
} from '../eventos/evento-integracion.js';

/** El inbox y los eventos que esperan a su campaña. */
export interface RegistroEventos {
  /** Anota el evento como procesado. `false` si ya lo estaba (R1). */
  registrarProcesado(evento: EventoIntegracion, ahora: Date): Promise<boolean>;

  /** R6: guarda un evento hasta que se conozca su campaña. */
  dejarEnEspera(
    evento: EventoDeCampanaConocida,
    idCampana: IdCampana,
    ahora: Date,
  ): Promise<void>;

  /** Saca los eventos que esperaban a la campaña, por orden de `ocurridoEn`. */
  extraerEnEspera(
    idCampana: IdCampana,
  ): Promise<readonly EventoDeCampanaConocida[]>;
}
