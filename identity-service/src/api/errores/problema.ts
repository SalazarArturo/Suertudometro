import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Media type de los errores (RFC 9457). */
export const TIPO_CONTENIDO_PROBLEMA = 'application/problem+json';

/** Base del `type` de los errores propios: `<base><codigo>` (stack §5.6). */
export const BASE_TIPO_ERROR = 'https://api.suertudometro.com/errores/';

/** Un campo de la petición que no pasó la validación. */
export class ErrorDeCampo {
  @ApiProperty({ example: 'correo' })
  campo: string;

  @ApiProperty({ example: 'Es obligatorio y debe ser un texto.' })
  mensaje: string;
}

/**
 * Cuerpo de todas las respuestas de error, con el formato RFC 9457
 * (docs/stack-y-convenciones.md §5.6).
 */
export class Problema {
  @ApiProperty({
    description:
      'Identifica el tipo de error. Es `about:blank` para los errores HTTP genéricos, como una ruta inexistente.',
    example: 'https://api.suertudometro.com/errores/correo-ya-registrado',
  })
  type: string;

  @ApiProperty({
    description:
      'Resumen del estado HTTP, igual para todos los errores con ese estado.',
    example: 'Conflicto',
  })
  title: string;

  @ApiProperty({ example: 409 })
  status: number;

  @ApiProperty({
    description: 'Explicación para personas de este caso concreto.',
    example: 'Ya existe una cuenta con ese correo.',
  })
  detail: string;

  @ApiProperty({
    description: 'Ruta de la petición que falló.',
    example: '/api/identidad/usuarios',
  })
  instance: string;

  @ApiPropertyOptional({
    description: 'Solo en los errores `validacion`: los campos que fallaron.',
    type: [ErrorDeCampo],
  })
  errores?: ErrorDeCampo[];
}
