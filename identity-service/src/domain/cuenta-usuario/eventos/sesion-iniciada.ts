import { EventoDeDominio } from '../../../sharedkernel/evento-de-dominio.js';
import { IdUsuario } from '../id-usuario.js';

/** Una cuenta inició sesión (event storming: "sesión iniciada"). No sale del servicio. */
export class SesionIniciada extends EventoDeDominio {
  constructor(
    readonly idUsuario: IdUsuario,
    ocurridoEn: Date,
  ) {
    super(ocurridoEn);
  }
}
