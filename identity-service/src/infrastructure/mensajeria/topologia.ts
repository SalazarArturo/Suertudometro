/**
 * Exchange topic de los eventos de integración (docs/rabbitmq.md §2).
 * identity-service solo publica: declara este exchange y ninguna cola.
 */
export const EXCHANGE_EVENTOS = 'suertudometro.events';

/**
 * Espera una promesa como máximo `ms` milisegundos. Si no termina a tiempo,
 * rechaza; la promesa original sigue su curso.
 */
export function conLimiteDeTiempo<T>(
  promesa: Promise<T>,
  ms: number,
): Promise<T> {
  let temporizador: NodeJS.Timeout | undefined;
  const limite = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(
      () => rechazar(new Error(`Sin respuesta en ${ms} ms`)),
      ms,
    );
  });
  return Promise.race([promesa, limite]).finally(() =>
    clearTimeout(temporizador),
  );
}

/** El mensaje de un error de cualquier tipo, para los logs y `ultimo_error`. */
export function describirError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
