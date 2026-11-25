import { ErrorDeAplicacion } from './error-de-aplicacion.js';

/** No se pudo hablar con el servidor de correo: el correo espera, sin sumar un intento. */
export class ServidorDeCorreoNoDisponible extends ErrorDeAplicacion {
  constructor(detalle: string) {
    super(
      'servidor-de-correo-no-disponible',
      `El servidor de correo no responde: ${detalle}`,
    );
  }
}
