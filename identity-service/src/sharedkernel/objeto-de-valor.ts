/**
 * Objeto inmutable que se compara por sus atributos, no por identidad
 * (por ejemplo, `Correo` o `IdUsuario`).
 *
 * Cada subclase valida sus reglas en el método de fábrica, así que no existe
 * un objeto de valor inválido.
 */
export abstract class ObjetoDeValor<TPropiedades extends object> {
  protected readonly propiedades: Readonly<TPropiedades>;

  protected constructor(propiedades: TPropiedades) {
    this.propiedades = Object.freeze({ ...propiedades });
  }

  esIgualA(otro?: ObjetoDeValor<TPropiedades> | null): boolean {
    if (otro === null || otro === undefined) {
      return false;
    }
    if (otro.constructor !== this.constructor) {
      return false;
    }
    const propias = this.propiedades as Record<string, unknown>;
    const ajenas = otro.propiedades as Record<string, unknown>;
    const claves = Object.keys(propias);
    return (
      claves.length === Object.keys(ajenas).length &&
      claves.every((clave) => valoresIguales(propias[clave], ajenas[clave]))
    );
  }
}

function valoresIguales(a: unknown, b: unknown): boolean {
  if (a instanceof ObjetoDeValor && b instanceof ObjetoDeValor) {
    return a.esIgualA(b);
  }
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }
  return Object.is(a, b);
}
