import { WritableSignal } from '@angular/core';
import { FormSubmitOptions, TreeValidationResult } from '@angular/forms/signals';
import { ERROR_DEL_SERVIDOR } from './errores-de-formulario';

/**
 * Las opciones de envío de un formulario (`submission` de `form()`), para que se
 * pueda volver a enviar con los mismos datos después de un error del servidor.
 *
 * Signal Forms cuenta ese error como uno de validación hasta que la persona cambia
 * un campo. Sin esto, después de un corte o de un servicio caído, volver a pulsar
 * el botón no hace nada.
 *
 * Un error del servidor en un campo (por ejemplo, un correo ya registrado) sí hay
 * que corregirlo antes de volver a enviar.
 *
 * No sirve si repetir el envío puede duplicar algo: tras un corte no se sabe si el
 * primero llegó.
 *
 * @param modelo los datos del formulario
 * @param accion el envío
 */
export function envioReintentable<T extends object>(
  modelo: WritableSignal<T>,
  accion: () => Promise<TreeValidationResult>,
): FormSubmitOptions<T, unknown> {
  return {
    // La acción corre siempre: lo que falta corregir se revisa aquí.
    ignoreValidators: 'all',
    action: async (_, { root }) => {
      const hayQueCorregir = root()
        .errorSummary()
        .some(({ kind, fieldTree }) => kind !== ERROR_DEL_SERVIDOR || fieldTree !== root);
      if (hayQueCorregir) {
        return undefined;
      }
      // Signal Forms quita el mensaje del intento anterior cuando cambia el valor.
      modelo.update((datos) => ({ ...datos }));
      return accion();
    },
  };
}
