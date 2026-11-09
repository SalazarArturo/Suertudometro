import { Rol, UsuarioSesion } from '../core/sesion/sesion.model';

// Contratos de identity-service (docs/servicios/identity-service.md §5).

/** Cuerpo de `POST /api/identidad/usuarios`. */
export interface RegistroPeticion {
  readonly nombre: string;
  readonly correo: string;
  readonly contrasena: string;
}

/** Cuerpo de `POST /api/identidad/sesiones`. */
export interface Credenciales {
  readonly correo: string;
  readonly contrasena: string;
}

/** Respuesta del registro y de `GET /api/identidad/perfil`. */
export interface UsuarioPerfil {
  readonly id: string;
  readonly nombre: string;
  readonly correo: string;
  readonly rol: Rol;
  /** Instante ISO 8601 en UTC. */
  readonly registradoEn: string;
}

/** Respuesta de `POST /api/identidad/sesiones`. */
export interface InicioSesionRespuesta {
  readonly tokenAcceso: string;
  readonly tipoToken: 'Bearer';
  /** Instante ISO 8601 en que vence el token. */
  readonly expiraEn: string;
  readonly usuario: UsuarioSesion;
}

/** Nombre de cada rol para mostrar en pantalla. */
export const NOMBRE_DEL_ROL: Readonly<Record<Rol, string>> = {
  USUARIO: 'Usuario',
  ADMINISTRADOR: 'Administrador',
};
