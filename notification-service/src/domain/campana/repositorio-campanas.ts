import type { IdCampana } from '../identificadores/id-campana.js';
import type { CampanaSeguida } from './campana-seguida.js';

export interface RepositorioCampanas {
  /**
   * Reserva la campaña hasta el final de la transacción, aunque todavía no
   * exista: así dos eventos de la misma campaña se procesan uno tras otro.
   */
  bloquear(id: IdCampana): Promise<void>;
  buscar(id: IdCampana): Promise<CampanaSeguida | null>;
  guardar(campana: CampanaSeguida): Promise<void>;
}
