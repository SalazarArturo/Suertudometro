import { ObjetoDeValor } from '../../sharedkernel/objeto-de-valor.js';
import { verificarRegla } from '../../sharedkernel/regla-de-negocio.js';
import { CorreoDebeSerValido } from './reglas/correo-debe-ser-valido.js';

/**
 * Correo de una cuenta (R1). Se guarda normalizado, sin espacios alrededor y en
 * minúsculas, así "Ana@Example.org" y "ana@example.org" son la misma cuenta (R2).
 */
export class Correo extends ObjetoDeValor<{ valor: string }> {
  static de(texto: string): Correo {
    const valor = texto.trim().toLowerCase();
    verificarRegla(new CorreoDebeSerValido(valor));
    return new Correo({ valor });
  }

  get valor(): string {
    return this.propiedades.valor;
  }

  override toString(): string {
    return this.valor;
  }
}
