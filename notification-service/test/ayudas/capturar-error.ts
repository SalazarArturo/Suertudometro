/**
 * Ejecuta la acción y devuelve el error que lanza, para revisar su `codigo`.
 * Si no lanza nada, la prueba falla.
 */
export function capturarError(accion: () => unknown): unknown {
  try {
    accion();
  } catch (error) {
    return error;
  }
  throw new Error('Se esperaba un error y la acción no lanzó ninguno.');
}
