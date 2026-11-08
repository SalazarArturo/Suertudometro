import { EventoDeDominio } from '../../../sharedkernel/evento-de-dominio.js';
import { Correo } from '../correo.js';
import { IdUsuario } from '../id-usuario.js';
import { Rol } from '../rol.js';

/**
 * Se creó una cuenta (event storming: "Usuario creado").
 * Sale al bus como `UsuarioRegistrado` (`usuario.registrado`), con
 * `datos: { idUsuario, correo }` (docs/contratos-de-eventos.md).
 */
export class UsuarioCreado extends EventoDeDominio {
  constructor(
    readonly idUsuario: IdUsuario,
    readonly correo: Correo,
    readonly rol: Rol,
    ocurridoEn: Date,
  ) {
    super(ocurridoEn);
  }
}
