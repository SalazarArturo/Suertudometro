import { ReadonlyFieldTree, ValidationError } from '@angular/forms/signals';
import { ErrorDeApi } from './error-de-api';

/** Tipo (`kind`) de los errores que vienen del servidor. */
export const ERROR_DEL_SERVIDOR = 'servidor';

/** Los campos del formulario, por su nombre en el API (`correo`, `contrasena`…). */
export type CamposDelFormulario = Readonly<Record<string, ReadonlyFieldTree<unknown>>>;

/**
 * Convierte un error del API en los errores que devuelve la acción de
 * `submit()`, para que Signal Forms los muestre en su campo (docs/frontend.md §5):
 * - los errores de un `400 validacion` van al campo con el mismo nombre;
 * - un código de `campoPorCodigo` (`correo-ya-registrado` → `correo`) va a ese campo;
 * - lo demás queda en el formulario, sin campo.
 *
 * Signal Forms borra el error de un campo cuando la persona lo cambia.
 */
export function erroresDeFormulario(
  error: ErrorDeApi,
  campos: CamposDelFormulario = {},
  campoPorCodigo: Readonly<Record<string, string>> = {},
): ValidationError.WithOptionalFieldTree[] {
  if (error.errores.length > 0) {
    return error.errores.map(({ campo, mensaje }) => {
      const destino = campos[campo];
      return destino
        ? { kind: ERROR_DEL_SERVIDOR, message: mensaje, fieldTree: destino }
        : { kind: ERROR_DEL_SERVIDOR, message: `${campo}: ${mensaje}` };
    });
  }

  const nombreCampo = error.codigo === undefined ? undefined : campoPorCodigo[error.codigo];
  const destino = nombreCampo === undefined ? undefined : campos[nombreCampo];
  return destino
    ? [{ kind: ERROR_DEL_SERVIDOR, message: error.detalle, fieldTree: destino }]
    : [{ kind: ERROR_DEL_SERVIDOR, message: error.detalle }];
}
