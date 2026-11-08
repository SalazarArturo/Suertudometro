import { applyDecorators, HttpStatus } from '@nestjs/common';
import { ApiHeader } from '@nestjs/swagger';
import { ROLES } from '../../application/vistas/usuario-vista.js';
import { RespuestaProblema } from '../errores/respuesta-problema.decorador.js';
import {
  CABECERA_ID,
  CABECERA_NOMBRE,
  CABECERA_ROL,
} from './usuario-autenticado.js';

/**
 * Documenta en OpenAPI los headers de identidad de una ruta con sesión, y su
 * 401. Solo documenta: quien exige la sesión es GuardIdentidad.
 */
export function DocumentarIdentidad(): MethodDecorator & ClassDecorator {
  const nota =
    'Lo pone el gateway a partir del token; el frontend no lo envía. Solo hace falta escribirlo al probar el servicio directamente.';
  return applyDecorators(
    ApiHeader({
      name: CABECERA_ID,
      required: true,
      description: `Id del usuario (UUID). ${nota}`,
      schema: { type: 'string', format: 'uuid' },
    }),
    ApiHeader({
      name: CABECERA_ROL,
      required: true,
      description: `Rol del usuario. ${nota}`,
      enum: ROLES,
    }),
    ApiHeader({
      name: CABECERA_NOMBRE,
      required: true,
      description: `Nombre en UTF-8 codificado para URL, por ejemplo \`Ana%20P%C3%A9rez\`. ${nota}`,
    }),
    RespuestaProblema(
      HttpStatus.UNAUTHORIZED,
      'Faltan los headers de identidad o no se pueden leer (`no-autenticado`).',
    ),
  );
}
