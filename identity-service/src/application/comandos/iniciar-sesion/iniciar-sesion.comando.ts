import { Command } from '@nestjs/cqrs';
import type { Rol } from '../../../domain/cuenta-usuario/rol.js';

export interface ResultadoInicioSesion {
  tokenAcceso: string;
  tipoToken: 'Bearer';
  expiraEn: Date;
  usuario: {
    id: string;
    nombre: string;
    correo: string;
    rol: Rol;
  };
}

/**
 * Inicio de sesión (event storming: IniciarSesion). Es un comando y no una
 * consulta porque cambia la cuenta: anota `ultimoInicioSesionEn`.
 */
export class IniciarSesionComando extends Command<ResultadoInicioSesion> {
  constructor(
    readonly correo: string,
    readonly contrasena: string,
  ) {
    super();
  }
}
