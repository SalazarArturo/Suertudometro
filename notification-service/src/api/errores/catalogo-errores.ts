import { HttpStatus } from '@nestjs/common';

/**
 * Estado HTTP de cada código de error de dominio o de aplicación
 * (docs/servicios/notification-service.md §5).
 *
 * - Un error de dominio que no está aquí responde 400.
 * - Un error de aplicación que no está aquí responde 500 y queda en el log,
 *   porque significa que falta agregarlo a este catálogo.
 */
export const ESTADO_POR_CODIGO: Readonly<Record<string, HttpStatus>> = {
  'aviso-no-encontrado': HttpStatus.NOT_FOUND,
};

const TITULO_POR_ESTADO: Readonly<Record<number, string>> = {
  400: 'Solicitud incorrecta',
  401: 'No autenticado',
  403: 'Prohibido',
  404: 'No encontrado',
  405: 'Método no permitido',
  409: 'Conflicto',
  413: 'Contenido demasiado grande',
  415: 'Tipo de contenido no admitido',
  500: 'Error interno del servidor',
};

/** El `title` del error: un resumen del estado HTTP, en español. */
export function tituloDe(estado: number): string {
  return (
    TITULO_POR_ESTADO[estado] ??
    (estado >= 500 ? 'Error del servidor' : 'Error de la solicitud')
  );
}
