import type { Request } from 'express';
import type { UsuarioVista } from '../../application/vistas/usuario-vista.js';

/**
 * Headers con la identidad que pone el gateway después de validar el JWT
 * (docs/servicios/identity-service.md §5.1).
 */
export const CABECERA_ID = 'X-Usuario-Id';
export const CABECERA_ROL = 'X-Usuario-Rol';
export const CABECERA_NOMBRE = 'X-Usuario-Nombre';

/** Quién hace la petición, según los headers del gateway. */
export interface UsuarioAutenticado {
  id: string;
  rol: UsuarioVista['rol'];
  /** Ya decodificado: con tildes y ñ. */
  nombre: string;
}

/** Una petición en la que GuardIdentidad ya leyó la identidad. */
export interface PeticionConIdentidad extends Request {
  usuario?: UsuarioAutenticado;
}
