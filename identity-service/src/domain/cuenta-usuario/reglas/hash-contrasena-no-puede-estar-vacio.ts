import { ReglaDeNegocio } from '../../../sharedkernel/regla-de-negocio.js';

/** R5: una cuenta siempre tiene el hash de su contraseña. */
export class HashContrasenaNoPuedeEstarVacio implements ReglaDeNegocio {
  readonly codigo = 'hash-contrasena-vacio';
  readonly mensaje = 'La cuenta necesita el hash de su contraseña.';

  private readonly vacio: boolean;

  constructor(hash: string) {
    this.vacio = hash.trim().length === 0;
  }

  seIncumple(): boolean {
    return this.vacio;
  }
}
