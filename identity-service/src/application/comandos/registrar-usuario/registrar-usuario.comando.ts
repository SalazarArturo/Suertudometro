import { Command } from '@nestjs/cqrs';
import type { UsuarioVista } from '../../vistas/usuario-vista.js';

/** Registro público de una cuenta (event storming: RegistrarUsuario). */
export class RegistrarUsuarioComando extends Command<UsuarioVista> {
  constructor(
    readonly nombre: string,
    readonly correo: string,
    readonly contrasena: string,
  ) {
    super();
  }
}
