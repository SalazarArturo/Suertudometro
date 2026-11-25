import type { IdUsuario } from '../identificadores/id-usuario.js';
import type { Correo } from './correo.js';

/** El correo al que se le escribe a una cuenta. */
export class Contacto {
  private constructor(
    readonly idUsuario: IdUsuario,
    readonly correo: Correo,
    readonly registradoEn: Date,
  ) {}

  static registrar(
    idUsuario: IdUsuario,
    correo: Correo,
    ahora: Date,
  ): Contacto {
    return new Contacto(idUsuario, correo, ahora);
  }
}
