/** Repite el intento hasta que da algo distinto de `null`, o falla al pasar `ms`. */
export async function esperarHasta<T>(
  intento: () => Promise<T | null>,
  ms = 15_000,
): Promise<T> {
  const limite = Date.now() + ms;
  for (;;) {
    const resultado = await intento();
    if (resultado !== null) {
      return resultado;
    }
    if (Date.now() > limite) {
      throw new Error(`No ocurrió en ${ms} ms`);
    }
    await new Promise((resolver) => setTimeout(resolver, 150));
  }
}
