import { ReglaDeNegocio } from '../../../sharedkernel/regla-de-negocio.js';

/** El correo tiene un formato válido y como máximo 254 caracteres, como en identity-service. */
export class CorreoDebeSerValido implements ReglaDeNegocio {
  static readonly LONGITUD_MAXIMA = 254;
  private static readonly FORMATO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  readonly codigo = 'correo-invalido';
  readonly mensaje = `El correo no tiene un formato válido o supera los ${CorreoDebeSerValido.LONGITUD_MAXIMA} caracteres.`;

  constructor(private readonly correo: string) {}

  seIncumple(): boolean {
    return (
      this.correo.length > CorreoDebeSerValido.LONGITUD_MAXIMA ||
      !CorreoDebeSerValido.FORMATO.test(this.correo)
    );
  }
}
