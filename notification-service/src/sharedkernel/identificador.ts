import { ObjetoDeValor } from './objeto-de-valor.js';
import { ReglaDeNegocio, verificarRegla } from './regla-de-negocio.js';

const FORMATO_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Un identificador es un UUID (docs/stack-y-convenciones.md §5.7). */
class IdentificadorDebeSerUuid implements ReglaDeNegocio {
  readonly mensaje: string;

  constructor(
    private readonly valor: string,
    readonly codigo: string,
    nombre: string,
  ) {
    this.mensaje = `El id ${nombre} no es un UUID válido.`;
  }

  seIncumple(): boolean {
    return !FORMATO_UUID.test(this.valor);
  }
}

/** Base de los identificadores. Se guardan en minúsculas y sin espacios. */
export abstract class Identificador extends ObjetoDeValor<{ valor: string }> {
  protected constructor(valor: string, codigo: string, nombre: string) {
    const normalizado = valor.trim().toLowerCase();
    verificarRegla(new IdentificadorDebeSerUuid(normalizado, codigo, nombre));
    super({ valor: normalizado });
  }

  get valor(): string {
    return this.propiedades.valor;
  }

  override toString(): string {
    return this.valor;
  }
}
