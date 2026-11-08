import { ObjetoDeValor } from '../../sharedkernel/objeto-de-valor.js';
import { verificarRegla } from '../../sharedkernel/regla-de-negocio.js';
import { IdUsuarioDebeSerUuid } from './reglas/id-usuario-debe-ser-uuid.js';

/** Identificador de una cuenta. Los demás servicios lo conocen como `idUsuario`. */
export class IdUsuario extends ObjetoDeValor<{ valor: string }> {
  static nuevo(): IdUsuario {
    return new IdUsuario({ valor: crypto.randomUUID() });
  }

  static de(valor: string): IdUsuario {
    const normalizado = valor.trim().toLowerCase();
    verificarRegla(new IdUsuarioDebeSerUuid(normalizado));
    return new IdUsuario({ valor: normalizado });
  }

  get valor(): string {
    return this.propiedades.valor;
  }

  override toString(): string {
    return this.valor;
  }
}
