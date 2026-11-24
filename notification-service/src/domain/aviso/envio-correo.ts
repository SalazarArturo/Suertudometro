import { ObjetoDeValor } from '../../sharedkernel/objeto-de-valor.js';
import { verificarRegla } from '../../sharedkernel/regla-de-negocio.js';
import { EnvioDebeEstarPendiente } from './reglas/envio-debe-estar-pendiente.js';

export type EstadoEnvio = 'PENDIENTE' | 'ENVIADO' | 'FALLIDO';

export interface DatosEnvioCorreo {
  estado: EstadoEnvio;
  intentos: number;
  proximoIntentoEn: Date;
  ultimoError: string | null;
  enviadoEn: Date | null;
}

/** R8: después del décimo intento fallido, el correo queda FALLIDO. */
export const MAXIMO_INTENTOS = 10;
const PRIMERA_ESPERA_MS = 10_000;
const ESPERA_MAXIMA_MS = 600_000;
const LARGO_MAXIMO_ERROR = 500;

/** R8: 10 s, 20 s, 40 s… hasta 10 minutos. */
export function esperaTrasFallo(intentos: number): number {
  return Math.min(PRIMERA_ESPERA_MS * 2 ** (intentos - 1), ESPERA_MAXIMA_MS);
}

/** El envío por correo de un aviso. Es inmutable: cada cambio da uno nuevo. */
export class EnvioCorreo extends ObjetoDeValor<DatosEnvioCorreo> {
  static pendiente(ahora: Date): EnvioCorreo {
    return new EnvioCorreo({
      estado: 'PENDIENTE',
      intentos: 0,
      proximoIntentoEn: ahora,
      ultimoError: null,
      enviadoEn: null,
    });
  }

  static reconstituir(datos: DatosEnvioCorreo): EnvioCorreo {
    return new EnvioCorreo(datos);
  }

  get datos(): Readonly<DatosEnvioCorreo> {
    return this.propiedades;
  }

  conExito(ahora: Date): EnvioCorreo {
    this.exigirPendiente();
    return new EnvioCorreo({
      ...this.propiedades,
      estado: 'ENVIADO',
      intentos: this.propiedades.intentos + 1,
      ultimoError: null,
      enviadoEn: ahora,
    });
  }

  conFallo(error: string, ahora: Date): EnvioCorreo {
    this.exigirPendiente();
    const intentos = this.propiedades.intentos + 1;
    return new EnvioCorreo({
      ...this.propiedades,
      estado: intentos >= MAXIMO_INTENTOS ? 'FALLIDO' : 'PENDIENTE',
      intentos,
      proximoIntentoEn: new Date(ahora.getTime() + esperaTrasFallo(intentos)),
      ultimoError: error.slice(0, LARGO_MAXIMO_ERROR),
    });
  }

  /** El servidor de correo no está: se intenta de nuevo sin sumar un intento. */
  pospuestoHasta(instante: Date): EnvioCorreo {
    this.exigirPendiente();
    return new EnvioCorreo({ ...this.propiedades, proximoIntentoEn: instante });
  }

  private exigirPendiente(): void {
    verificarRegla(new EnvioDebeEstarPendiente(this.propiedades.estado));
  }
}
