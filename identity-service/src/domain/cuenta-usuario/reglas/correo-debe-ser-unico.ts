import { ReglaDeNegocio } from '../../../sharedkernel/regla-de-negocio.js';

/**
 * R2: el correo es único. Saber si ya existe requiere consultar el repositorio,
 * así que quien la verifica le pasa el resultado de esa consulta.
 */
export class CorreoDebeSerUnico implements ReglaDeNegocio {
  readonly codigo = 'correo-ya-registrado';
  readonly mensaje = 'Ya existe una cuenta con ese correo.';

  constructor(private readonly yaRegistrado: boolean) {}

  seIncumple(): boolean {
    return this.yaRegistrado;
  }
}
