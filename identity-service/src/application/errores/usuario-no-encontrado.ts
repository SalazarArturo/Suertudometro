import { ErrorDeAplicacion } from './error-de-aplicacion.js';

export class UsuarioNoEncontrado extends ErrorDeAplicacion {
  constructor(idUsuario: string) {
    super(
      'usuario-no-encontrado',
      `No existe una cuenta con el id ${idUsuario}.`,
    );
  }
}
