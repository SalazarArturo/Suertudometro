import { ObjetoDeValor } from './objeto-de-valor.js';
import { ReglaDeNegocio, verificarRegla } from './regla-de-negocio.js';

/** Un importe es texto con dos decimales y su moneda ISO 4217 (stack §5.7). */
class DineroDebeSerValido implements ReglaDeNegocio {
  readonly codigo = 'dinero-invalido';
  readonly mensaje =
    'El importe debe ser un texto con dos decimales y una moneda ISO 4217.';

  constructor(
    private readonly monto: string,
    private readonly moneda: string,
  ) {}

  seIncumple(): boolean {
    return (
      !/^\d{1,10}\.\d{2}$/.test(this.monto) || !/^[A-Z]{3}$/.test(this.moneda)
    );
  }
}

/**
 * Dinero como texto, nunca como número con coma flotante. Este servicio no hace
 * cuentas: solo lo valida y lo muestra.
 */
export class Dinero extends ObjetoDeValor<{ monto: string; moneda: string }> {
  static de(monto: string, moneda: string): Dinero {
    verificarRegla(new DineroDebeSerValido(monto, moneda));
    return new Dinero({ monto, moneda });
  }

  get monto(): string {
    return this.propiedades.monto;
  }

  get moneda(): string {
    return this.propiedades.moneda;
  }

  /** Para personas: `Bs 1.250,50`. Trabaja sobre el texto, sin convertir a número. */
  paraMostrar(): string {
    const [enteros, decimales] = this.monto.split('.');
    const conMiles = enteros
      .replace(/^0+(?=\d)/, '')
      .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    const simbolo = this.moneda === 'BOB' ? 'Bs' : this.moneda;
    return `${simbolo} ${conMiles},${decimales}`;
  }
}
