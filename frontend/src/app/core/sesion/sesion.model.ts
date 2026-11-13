/** Roles del sistema (docs/servicios/identity-service.md §2). */
export type Rol = 'USUARIO' | 'ADMINISTRADOR';

export const ROLES: readonly Rol[] = ['USUARIO', 'ADMINISTRADOR'];

/** El usuario de la sesión, tal como lo devuelve el inicio de sesión. */
export interface UsuarioSesion {
  readonly id: string;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: Rol;
}

/** Lo que se guarda de una sesión iniciada. */
export interface DatosSesion {
  readonly tokenAcceso: string;
  /** Instante ISO 8601 en que vence el token. */
  readonly expiraEn: string;
  readonly usuario: UsuarioSesion;
}
