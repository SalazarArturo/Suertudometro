/** El mensaje de un error de cualquier tipo, para los logs. */
export function describirError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
