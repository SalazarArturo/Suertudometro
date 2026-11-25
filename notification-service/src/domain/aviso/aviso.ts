import { IdAviso } from '../identificadores/id-aviso.js';
import type { IdCampana } from '../identificadores/id-campana.js';
import type { IdUsuario } from '../identificadores/id-usuario.js';
import type { ContenidoAviso, TipoAviso } from './contenido-aviso.js';
import { EnvioCorreo } from './envio-correo.js';

/** De qué evento sale un aviso. */
export interface OrigenAviso {
  readonly idEvento: string;
  readonly ocurridoEn: Date;
  readonly idCampana: IdCampana;
}

export interface DatosAviso extends OrigenAviso {
  readonly id: IdAviso;
  readonly idDestinatario: IdUsuario;
  readonly contenido: ContenidoAviso;
  readonly creadoEn: Date;
  readonly leidoEn: Date | null;
  readonly envio: EnvioCorreo;
}

/**
 * Un mensaje para una persona. Vive en su bandeja y además se le manda por
 * correo; leerlo y enviarlo son independientes.
 */
export class Aviso {
  readonly id: IdAviso;
  readonly idDestinatario: IdUsuario;
  readonly contenido: ContenidoAviso;
  readonly idCampana: IdCampana;
  readonly idEvento: string;
  readonly ocurridoEn: Date;
  readonly creadoEn: Date;
  #leidoEn: Date | null;
  #envio: EnvioCorreo;

  private constructor(datos: DatosAviso) {
    this.id = datos.id;
    this.idDestinatario = datos.idDestinatario;
    this.contenido = datos.contenido;
    this.idCampana = datos.idCampana;
    this.idEvento = datos.idEvento;
    this.ocurridoEn = datos.ocurridoEn;
    this.creadoEn = datos.creadoEn;
    this.#leidoEn = datos.leidoEn;
    this.#envio = datos.envio;
  }

  static crear(
    idDestinatario: IdUsuario,
    contenido: ContenidoAviso,
    origen: OrigenAviso,
    ahora: Date,
  ): Aviso {
    return new Aviso({
      idEvento: origen.idEvento,
      ocurridoEn: origen.ocurridoEn,
      idCampana: origen.idCampana,
      id: IdAviso.nuevo(),
      idDestinatario,
      contenido,
      creadoEn: ahora,
      leidoEn: null,
      envio: EnvioCorreo.pendiente(ahora),
    });
  }

  static reconstituir(datos: DatosAviso): Aviso {
    return new Aviso(datos);
  }

  get tipo(): TipoAviso {
    return this.contenido.tipo;
  }

  get leidoEn(): Date | null {
    return this.#leidoEn;
  }

  get envio(): EnvioCorreo {
    return this.#envio;
  }

  /** R7: marcarlo otra vez conserva la primera fecha. */
  marcarLeido(ahora: Date): void {
    this.#leidoEn ??= ahora;
  }

  registrarEnvio(ahora: Date): void {
    this.#envio = this.#envio.conExito(ahora);
  }

  registrarFallo(error: string, ahora: Date): void {
    this.#envio = this.#envio.conFallo(error, ahora);
  }

  posponerEnvio(hasta: Date): void {
    this.#envio = this.#envio.pospuestoHasta(hasta);
  }
}
