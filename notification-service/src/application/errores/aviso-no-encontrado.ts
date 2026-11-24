import { ErrorDeAplicacion } from './error-de-aplicacion.js';

/** R7: el mismo error si no existe o si es de otra persona, para no revelarlo. */
export class AvisoNoEncontrado extends ErrorDeAplicacion {
  constructor(idAviso: string) {
    super(
      'aviso-no-encontrado',
      `No tienes ningún aviso con el id ${idAviso}.`,
    );
  }
}
