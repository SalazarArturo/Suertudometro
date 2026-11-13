import { BASE_TIPO_ERROR } from '../app/core/http/error-de-api';
import { DatosSesion, Rol } from '../app/core/sesion/sesion.model';
import { InicioSesionRespuesta, UsuarioPerfil } from '../app/identidad/identidad.model';

// Datos compartidos por las pruebas. No forma parte del build de la aplicación.

export const URL_API_PRUEBA = 'http://api.prueba/api';

const ID_USUARIO = 'e3b68016-9750-41b3-9e34-762dd8346001';

/** Una sesión que vence dentro de una hora. */
export function sesionDePrueba(rol: Rol = 'USUARIO'): DatosSesion {
  return {
    tokenAcceso: 'token.de.prueba',
    expiraEn: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    usuario: { id: ID_USUARIO, nombre: 'Ana Pérez', correo: 'ana@example.org', rol },
  };
}

/** Respuesta de `POST /api/identidad/sesiones`. */
export function inicioSesionDePrueba(): InicioSesionRespuesta {
  return { ...sesionDePrueba(), tipoToken: 'Bearer' };
}

/** Respuesta del registro y de `GET /api/identidad/perfil`. */
export const PERFIL_DE_PRUEBA: UsuarioPerfil = {
  id: ID_USUARIO,
  nombre: 'Ana Pérez',
  correo: 'ana@example.org',
  rol: 'USUARIO',
  registradoEn: '2026-11-07T14:00:00Z',
};

/** Un cuerpo RFC 9457 como los de identity-service. */
export function problemaDePrueba(codigo: string, status: number, detail: string) {
  return { type: `${BASE_TIPO_ERROR}${codigo}`, title: 'Título', status, detail, instance: '/api' };
}
