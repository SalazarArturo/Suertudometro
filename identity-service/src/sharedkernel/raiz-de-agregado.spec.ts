import { EventoDeDominio } from './evento-de-dominio.js';
import { ObjetoDeValor } from './objeto-de-valor.js';
import { RaizDeAgregado } from './raiz-de-agregado.js';

class IdEjemplo extends ObjetoDeValor<{ valor: string }> {
  static de(valor: string): IdEjemplo {
    return new IdEjemplo({ valor });
  }
}

class EjemploNombrado extends EventoDeDominio {
  constructor(
    readonly nombre: string,
    ocurridoEn: Date,
  ) {
    super(ocurridoEn);
  }
}

class Ejemplo extends RaizDeAgregado<IdEjemplo> {
  static crear(id: string): Ejemplo {
    return new Ejemplo(IdEjemplo.de(id));
  }

  nombrar(nombre: string, ahora: Date): void {
    this.registrarEvento(new EjemploNombrado(nombre, ahora));
  }
}

class OtroEjemplo extends RaizDeAgregado<IdEjemplo> {
  static crear(id: string): OtroEjemplo {
    return new OtroEjemplo(IdEjemplo.de(id));
  }
}

const ahora = new Date('2026-11-07T14:00:00Z');

describe('RaizDeAgregado', () => {
  it('acumula sus eventos en orden', () => {
    const ejemplo = Ejemplo.crear('a');

    ejemplo.nombrar('primero', ahora);
    ejemplo.nombrar('segundo', ahora);

    expect(
      ejemplo.eventosPendientes.map((e) => (e as EjemploNombrado).nombre),
    ).toEqual(['primero', 'segundo']);
  });

  it('extraerEventos devuelve los eventos y los borra', () => {
    const ejemplo = Ejemplo.crear('a');
    ejemplo.nombrar('primero', ahora);

    const extraidos = ejemplo.extraerEventos();

    expect(extraidos).toHaveLength(1);
    expect(ejemplo.eventosPendientes).toHaveLength(0);
  });

  it('eventosPendientes no permite modificar la lista interna', () => {
    const ejemplo = Ejemplo.crear('a');
    ejemplo.nombrar('primero', ahora);

    (ejemplo.eventosPendientes as EventoDeDominio[]).pop();

    expect(ejemplo.eventosPendientes).toHaveLength(1);
  });

  it('es el mismo agregado si tiene la misma clase y el mismo id', () => {
    expect(Ejemplo.crear('a').esIgualA(Ejemplo.crear('a'))).toBe(true);
    expect(Ejemplo.crear('a').esIgualA(Ejemplo.crear('b'))).toBe(false);
    expect(Ejemplo.crear('a').esIgualA(OtroEjemplo.crear('a'))).toBe(false);
    expect(Ejemplo.crear('a').esIgualA(null)).toBe(false);
  });
});

describe('EventoDeDominio', () => {
  it('genera un idEvento UUID y conserva el instante', () => {
    const evento = new EjemploNombrado('x', ahora);

    expect(evento.idEvento).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(evento.ocurridoEn).toBe(ahora);
  });

  it('genera un idEvento distinto para cada evento', () => {
    expect(new EjemploNombrado('x', ahora).idEvento).not.toBe(
      new EjemploNombrado('x', ahora).idEvento,
    );
  });
});
