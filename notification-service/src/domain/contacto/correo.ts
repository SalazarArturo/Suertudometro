import { ObjetoDeValor } from '../../sharedkernel/objeto-de-valor.js';
import { verificarRegla } from '../../sharedkernel/regla-de-negocio.js';
import { CorreoDebeSerValido } from './reglas/correo-debe-ser-valido.js';

/** El correo de una cuenta, sin espacios alrededor y en minúsculas. */
export class Correo extends ObjetoDeValor<{ valor: string }> {
  static de(texto: string): Correo {
    const valor = texto.trim().toLowerCase();
    verificarRegla(new CorreoDebeSerValido(valor));
    return new Correo({ valor });
  }

  get valor(): string {
    return this.propiedades.valor;
  }
}
