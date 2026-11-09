import { HttpErrorResponse } from '@angular/common/http';

/** Prefijo del `type` de los errores del sistema (docs/stack-y-convenciones.md §5.6). */
export const BASE_TIPO_ERROR = 'https://api.suertudometro.com/errores/';

/** Un error de un campo, como lo devuelve un `400 validacion`. */
export interface ErrorDeCampo {
  readonly campo: string;
  readonly mensaje: string;
}

/** Un error del API ya interpretado, listo para mostrar (docs/frontend.md §5). */
export interface ErrorDeApi {
  /** Estado HTTP, o 0 si no hubo respuesta. */
  readonly estado: number;
  /** El final del `type` (`correo-ya-registrado`), o `undefined` si no es un error del catálogo. */
  readonly codigo: string | undefined;
  /** Texto para la persona. */
  readonly detalle: string;
  /** Los errores por campo de un `400 validacion`. */
  readonly errores: readonly ErrorDeCampo[];
}

/** Cuerpo RFC 9457 (`application/problem+json`). */
interface Problema {
  readonly type: string;
  readonly title?: string;
  readonly status?: number;
  readonly detail?: string;
  readonly errores?: unknown;
}

const SIN_CONEXION =
  'No se pudo conectar con el servidor. Revisa tu conexión o intenta de nuevo en unos minutos.';
const INESPERADO = 'Ocurrió un error inesperado. Intenta de nuevo más tarde.';
const NO_DISPONIBLE =
  'El servicio no está disponible en este momento. Intenta de nuevo en unos minutos.';

const DETALLE_POR_ESTADO: Partial<Record<number, string>> = {
  401: 'Hace falta iniciar sesión.',
  403: 'No tienes permiso para hacer esto.',
  404: 'No encontramos lo que buscas.',
  429: 'Hiciste demasiadas peticiones seguidas. Espera un momento y vuelve a intentarlo.',
  502: NO_DISPONIBLE,
  503: NO_DISPONIBLE,
  504: 'El servidor tardó demasiado en responder. Intenta de nuevo en unos minutos.',
};

/** Convierte cualquier error de una petición en un `ErrorDeApi`. */
export function leerErrorDeApi(error: unknown): ErrorDeApi {
  if (!(error instanceof HttpErrorResponse)) {
    return { estado: 0, codigo: undefined, detalle: INESPERADO, errores: [] };
  }
  if (error.status === 0) {
    return { estado: 0, codigo: undefined, detalle: SIN_CONEXION, errores: [] };
  }

  const porEstado = DETALLE_POR_ESTADO[error.status];
  const cuerpo: unknown = error.error;
  if (!esProblema(cuerpo)) {
    return {
      estado: error.status,
      codigo: undefined,
      detalle: porEstado ?? INESPERADO,
      errores: [],
    };
  }
  return {
    estado: error.status,
    codigo: cuerpo.type.startsWith(BASE_TIPO_ERROR)
      ? cuerpo.type.slice(BASE_TIPO_ERROR.length)
      : undefined,
    detalle: cuerpo.detail ?? porEstado ?? cuerpo.title ?? INESPERADO,
    errores: erroresDeCampo(cuerpo.errores),
  };
}

function esProblema(cuerpo: unknown): cuerpo is Problema {
  return (
    typeof cuerpo === 'object' &&
    cuerpo !== null &&
    typeof (cuerpo as { type?: unknown }).type === 'string'
  );
}

function erroresDeCampo(valor: unknown): ErrorDeCampo[] {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor.filter(
    (error): error is ErrorDeCampo =>
      typeof error === 'object' &&
      error !== null &&
      typeof (error as { campo?: unknown }).campo === 'string' &&
      typeof (error as { mensaje?: unknown }).mensaje === 'string',
  );
}
