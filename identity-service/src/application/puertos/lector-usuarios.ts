import type { IdUsuario } from '../../domain/cuenta-usuario/id-usuario.js';
import type { UsuarioVista } from '../vistas/usuario-vista.js';

/**
 * Lado de lectura (CQRS): devuelve la vista directamente, sin cargar el agregado
 * ni el hash de la contraseña.
 */
export interface LectorUsuarios {
  obtenerPorId(id: IdUsuario): Promise<UsuarioVista | null>;
}
