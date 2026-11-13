import { ObjetoDeValor } from '../../sharedkernel/objeto-de-valor.js';
import { verificarRegla } from '../../sharedkernel/regla-de-negocio.js';
import { NombreDebeTenerLongitudValida } from './reglas/nombre-debe-tener-longitud-valida.js';

/**
 * Nombre visible de la persona (R3). Viaja en el header `X-Usuario-Nombre`
 * y contribution-service lo usa como `nombreAportante`.
 */
export class NombreUsuario extends ObjetoDeValor<{ valor: string }> {
  static de(texto: string): NombreUsuario {
    const valor = texto.trim();
    verificarRegla(new NombreDebeTenerLongitudValida(valor));
    return new NombreUsuario({ valor });
  }

  get valor(): string {
    return this.propiedades.valor;
  }

  override toString(): string {
    return this.valor;
  }
}
