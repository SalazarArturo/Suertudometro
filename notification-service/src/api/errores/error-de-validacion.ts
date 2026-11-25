import { HttpStatus } from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { ErrorDeApi } from './error-de-api.js';
import type { ErrorDeCampo } from './problema.js';

/**
 * La petición no tiene la forma esperada: falta un campo, no es del tipo
 * correcto o sobra uno. Lo lanza el ValidationPipe global y FiltroProblemas lo
 * responde como `400 validacion`, con la lista de campos.
 */
export class ErrorDeValidacion extends ErrorDeApi {
  constructor(readonly errores: ErrorDeCampo[]) {
    super(
      'validacion',
      HttpStatus.BAD_REQUEST,
      'Los datos enviados no tienen la forma esperada.',
    );
  }
}

/** Mensajes propios para las restricciones que class-validator agrega solo. */
const MENSAJE_POR_RESTRICCION: Readonly<Record<string, string>> = {
  whitelistValidation: 'No es un campo permitido.',
  unknownValue: 'El cuerpo de la petición debe ser un objeto JSON.',
};

/** `exceptionFactory` del ValidationPipe global. */
export function crearErrorDeValidacion(
  errores: ValidationError[],
): ErrorDeValidacion {
  return new ErrorDeValidacion(aplanar(errores, ''));
}

// Los errores de un objeto anidado vienen en `children`: se aplanan con la ruta
// completa del campo (por ejemplo, `direccion.ciudad`).
function aplanar(errores: ValidationError[], prefijo: string): ErrorDeCampo[] {
  return errores.flatMap((error) => {
    // Sin propiedad, el problema es el cuerpo entero (por ejemplo, un arreglo).
    const campo = `${prefijo}${error.property}` || 'cuerpo';
    const propios = Object.entries(error.constraints ?? {}).map(
      ([restriccion, mensaje]) => ({
        campo,
        mensaje: MENSAJE_POR_RESTRICCION[restriccion] ?? mensaje,
      }),
    );
    return [...propios, ...aplanar(error.children ?? [], `${campo}.`)];
  });
}
