import { Command } from '@nestjs/cqrs';

export type ResultadoCreacionAdministrador =
  { creado: true; idUsuario: string } | { creado: false };

/**
 * Siembra del primer administrador al arrancar el servicio, con los datos de
 * ADMIN_CORREO y ADMIN_CONTRASENA. No es un comando del event storming porque
 * no lo decide ningún actor: es la inicialización que hace falta para que
 * exista quien apruebe las campañas.
 */
export class CrearAdministradorInicialComando extends Command<ResultadoCreacionAdministrador> {
  constructor(
    readonly nombre: string,
    readonly correo: string,
    readonly contrasena: string,
  ) {
    super();
  }
}
