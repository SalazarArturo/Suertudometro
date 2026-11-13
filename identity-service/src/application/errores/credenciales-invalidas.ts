import { ErrorDeAplicacion } from './error-de-aplicacion.js';

/**
 * R7: el mismo error si el correo no existe o si la contraseña no coincide,
 * para no revelar qué correos están registrados.
 */
export class CredencialesInvalidas extends ErrorDeAplicacion {
  constructor() {
    super(
      'credenciales-invalidas',
      'El correo o la contraseña no son correctos.',
    );
  }
}
