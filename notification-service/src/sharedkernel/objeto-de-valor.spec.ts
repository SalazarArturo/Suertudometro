import { ObjetoDeValor } from './objeto-de-valor.js';

class Rango extends ObjetoDeValor<{ minimo: number; maximo: number }> {
  static crear(minimo: number, maximo: number): Rango {
    return new Rango({ minimo, maximo });
  }

  get minimo(): number {
    return this.propiedades.minimo;
  }
}

class OtroRango extends ObjetoDeValor<{ minimo: number; maximo: number }> {
  static crear(minimo: number, maximo: number): OtroRango {
    return new OtroRango({ minimo, maximo });
  }
}

class Periodo extends ObjetoDeValor<{ rango: Rango; desde: Date }> {
  static crear(rango: Rango, desde: Date): Periodo {
    return new Periodo({ rango, desde });
  }
}

describe('ObjetoDeValor', () => {
  it('es igual a otro con los mismos atributos', () => {
    expect(Rango.crear(1, 5).esIgualA(Rango.crear(1, 5))).toBe(true);
  });

  it('es distinto si cambia algún atributo', () => {
    expect(Rango.crear(1, 5).esIgualA(Rango.crear(1, 6))).toBe(false);
  });

  it('es distinto de un objeto de otra clase con los mismos atributos', () => {
    expect(Rango.crear(1, 5).esIgualA(OtroRango.crear(1, 5))).toBe(false);
  });

  it('es distinto de null y de undefined', () => {
    expect(Rango.crear(1, 5).esIgualA(null)).toBe(false);
    expect(Rango.crear(1, 5).esIgualA(undefined)).toBe(false);
  });

  it('compara por valor los objetos de valor anidados y las fechas', () => {
    const desde = '2026-11-07T14:00:00Z';
    const a = Periodo.crear(Rango.crear(1, 5), new Date(desde));
    const b = Periodo.crear(Rango.crear(1, 5), new Date(desde));

    expect(a.esIgualA(b)).toBe(true);
  });

  it('es inmutable', () => {
    const rango = Rango.crear(1, 5);

    expect(() => {
      (
        rango as unknown as { propiedades: { minimo: number } }
      ).propiedades.minimo = 9;
    }).toThrow(TypeError);
    expect(rango.minimo).toBe(1);
  });
});
