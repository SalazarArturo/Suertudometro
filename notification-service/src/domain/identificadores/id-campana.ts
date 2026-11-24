import { Identificador } from '../../sharedkernel/identificador.js';

/** Identifica a una campaña. Es el mismo `idCampana` de campaign-service. */
export class IdCampana extends Identificador {
  static de(valor: string): IdCampana {
    return new IdCampana(valor, 'id-campana-invalido', 'de campaña');
  }
}
