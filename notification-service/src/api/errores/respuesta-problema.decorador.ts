import { applyDecorators } from '@nestjs/common';
import { ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ErrorDeCampo, Problema, TIPO_CONTENIDO_PROBLEMA } from './problema.js';

/**
 * Documenta en OpenAPI una respuesta de error con su media type real,
 * `application/problem+json`, y el esquema de `Problema`.
 */
export function RespuestaProblema(
  estado: number,
  descripcion: string,
): MethodDecorator & ClassDecorator {
  return applyDecorators(
    ApiExtraModels(Problema, ErrorDeCampo),
    ApiResponse({
      status: estado,
      description: descripcion,
      content: {
        [TIPO_CONTENIDO_PROBLEMA]: {
          schema: { $ref: getSchemaPath(Problema) },
        },
      },
    }),
  );
}
