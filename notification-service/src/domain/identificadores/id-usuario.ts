import { Identificador } from '../../sharedkernel/identificador.js';

/** Identifica a una cuenta. Es el mismo `idUsuario` de identity-service. */
export class IdUsuario extends Identificador {
  static de(valor: string): IdUsuario {
    return new IdUsuario(valor, 'id-usuario-invalido', 'de usuario');
  }
}
