import type { EventoDeDominio } from './evento-de-dominio.js';
import type { ObjetoDeValor } from './objeto-de-valor.js';

/**
 * Raíz de un agregado: la única puerta de entrada al agregado y la que acumula
 * sus eventos de dominio hasta que el repositorio los guarda.
 */
export abstract class RaizDeAgregado<TId extends ObjetoDeValor<object>> {
  readonly #eventos: EventoDeDominio[] = [];

  protected constructor(readonly id: TId) {}

  protected registrarEvento(evento: EventoDeDominio): void {
    this.#eventos.push(evento);
  }

  /** Eventos producidos desde que se creó o se cargó el agregado, en orden. */
  get eventosPendientes(): readonly EventoDeDominio[] {
    return [...this.#eventos];
  }

  /** Devuelve los eventos pendientes y los borra. Lo usa el repositorio al guardar. */
  extraerEventos(): EventoDeDominio[] {
    return this.#eventos.splice(0);
  }

  /** Dos agregados son el mismo si son de la misma clase y tienen el mismo id. */
  esIgualA(otro?: RaizDeAgregado<TId> | null): boolean {
    return (
      otro !== null &&
      otro !== undefined &&
      otro.constructor === this.constructor &&
      this.id.esIgualA(otro.id)
    );
  }
}
