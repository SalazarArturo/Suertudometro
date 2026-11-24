import { Identificador } from '../../sharedkernel/identificador.js';

/** Identifica a un aviso. */
export class IdAviso extends Identificador {
  static nuevo(): IdAviso {
    return IdAviso.de(crypto.randomUUID());
  }

  static de(valor: string): IdAviso {
    return new IdAviso(valor, 'id-aviso-invalido', 'de aviso');
  }
}
