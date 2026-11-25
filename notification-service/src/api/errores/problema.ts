import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Media type de los errores (RFC 9457). */
export const TIPO_CONTENIDO_PROBLEMA = 'application/problem+json';

/** Base del `type` de los errores propios: `<base><codigo>` (stack §5.6). */
export const BASE_TIPO_ERROR = 'https://api.suertudometro.com/errores/';

/** Un campo de la petición que no pasó la validación. */
export class ErrorDeCampo {
  @ApiProperty({ example: 'tamano' })
  campo: string;

  @ApiProperty({ example: 'No puede pasar de 100.' })
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
    example: 'https://api.suertudometro.com/errores/aviso-no-encontrado',
  })
  type: string;

  @ApiProperty({
    description:
      'Resumen del estado HTTP, igual para todos los errores con ese estado.',
    example: 'No encontrado',
  })
  title: string;

  @ApiProperty({ example: 404 })
  status: number;

  @ApiProperty({
    description: 'Explicación para personas de este caso concreto.',
    example: 'No tienes ningún aviso con ese id.',
  })
  detail: string;

  @ApiProperty({
    description: 'Ruta de la petición que falló.',
    example: '/api/notificaciones/avisos',
  })
  instance: string;

  @ApiPropertyOptional({
    description: 'Solo en los errores `validacion`: los campos que fallaron.',
    type: [ErrorDeCampo],
  })
  errores?: ErrorDeCampo[];
}
