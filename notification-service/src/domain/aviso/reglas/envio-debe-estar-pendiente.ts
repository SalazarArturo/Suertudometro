import { ReglaDeNegocio } from '../../../sharedkernel/regla-de-negocio.js';

/** El resultado de un correo se registra una sola vez: después ya no cambia. */
export class EnvioDebeEstarPendiente implements ReglaDeNegocio {
  readonly codigo = 'envio-no-pendiente';
  readonly mensaje = 'El correo de este aviso ya no está pendiente.';

  constructor(private readonly estado: string) {}

  seIncumple(): boolean {
    return this.estado !== 'PENDIENTE';
  }
}
