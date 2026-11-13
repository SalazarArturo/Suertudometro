import { ReglaDeNegocio } from '../../../sharedkernel/regla-de-negocio.js';
import { contarCaracteres } from '../../../sharedkernel/texto.js';

/**
 * R4: la contraseña tiene entre 8 y 128 caracteres. Se pide longitud y no
 * combinaciones de símbolos, como recomienda NIST SP 800-63B.
 *
 * La regla guarda solo la longitud, nunca la contraseña: el error que produce
 * puede terminar en un log (R5).
 */
export class ContrasenaDebeTenerLongitudValida implements ReglaDeNegocio {
  static readonly LONGITUD_MINIMA = 8;
  static readonly LONGITUD_MAXIMA = 128;

  readonly codigo = 'contrasena-invalida';
  readonly mensaje = `La contraseña debe tener entre ${ContrasenaDebeTenerLongitudValida.LONGITUD_MINIMA} y ${ContrasenaDebeTenerLongitudValida.LONGITUD_MAXIMA} caracteres.`;

  private readonly longitud: number;

  constructor(contrasenaEnClaro: string) {
    this.longitud = contarCaracteres(contrasenaEnClaro);
  }

  seIncumple(): boolean {
    return (
      this.longitud < ContrasenaDebeTenerLongitudValida.LONGITUD_MINIMA ||
      this.longitud > ContrasenaDebeTenerLongitudValida.LONGITUD_MAXIMA
    );
  }
}
