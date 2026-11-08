import { ObjetoDeValor } from '../../sharedkernel/objeto-de-valor.js';
import { verificarRegla } from '../../sharedkernel/regla-de-negocio.js';
import { HashContrasenaNoPuedeEstarVacio } from './reglas/hash-contrasena-no-puede-estar-vacio.js';

const OCULTO = '[hash oculto]';

/**
 * Hash de la contraseña (R5). La cuenta nunca recibe la contraseña en claro:
 * solo este objeto, que calcula el puerto `CifradorContrasenas`.
 *
 * Al convertirlo a texto, a JSON o al inspeccionarlo en un log, el hash
 * no aparece: solo `[hash oculto]`.
 */
export class HashContrasena extends ObjetoDeValor<{ valor: string }> {
  static de(valor: string): HashContrasena {
    verificarRegla(new HashContrasenaNoPuedeEstarVacio(valor));
    return new HashContrasena({ valor });
  }

  /** El hash tal cual. Solo lo usan el cifrador y la persistencia. */
  get valor(): string {
    return this.propiedades.valor;
  }

  override toString(): string {
    return OCULTO;
  }

  toJSON(): string {
    return OCULTO;
  }

  [Symbol.for('nodejs.util.inspect.custom')](): string {
    return `HashContrasena ${OCULTO}`;
  }
}
