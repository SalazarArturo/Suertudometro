import { ServidorDeCorreoNoDisponible } from '../../src/application/errores/servidor-de-correo-no-disponible.js';
import type {
  CorreoSaliente,
  EnviadorCorreo,
} from '../../src/application/puertos/enviador-correo.js';

/** Guarda los correos en vez de enviarlos, y falla cuando se le pide. */
export class EnviadorCorreoFalso implements EnviadorCorreo {
  readonly enviados: CorreoSaliente[] = [];
  sinServidor = false;
  /** Los destinatarios que el servidor rechaza. */
  readonly rechazados = new Set<string>();

  enviar(correo: CorreoSaliente): Promise<void> {
    if (this.sinServidor) {
      return Promise.reject(new ServidorDeCorreoNoDisponible('ECONNREFUSED'));
    }
    if (this.rechazados.has(correo.para)) {
      return Promise.reject(new Error('550 buzón inexistente'));
    }
    this.enviados.push(correo);
    return Promise.resolve();
  }
}
