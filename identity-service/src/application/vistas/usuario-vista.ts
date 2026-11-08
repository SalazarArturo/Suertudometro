import type { CuentaUsuario } from '../../domain/cuenta-usuario/cuenta-usuario.js';
import { Rol } from '../../domain/cuenta-usuario/rol.js';

/** Los valores posibles de `UsuarioVista.rol`, para documentarlos en la API. */
export const ROLES: readonly `${Rol}`[] = Object.values(Rol);

/**
 * Lo que se muestra de una cuenta: en la respuesta del registro y en el perfil.
 * Nunca incluye el hash de la contraseña.
 */
export interface UsuarioVista {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
  registradoEn: Date;
}

export function aUsuarioVista(cuenta: CuentaUsuario): UsuarioVista {
  return {
    id: cuenta.id.valor,
    nombre: cuenta.nombre.valor,
    correo: cuenta.correo.valor,
    rol: cuenta.rol,
    registradoEn: cuenta.registradoEn,
  };
}
