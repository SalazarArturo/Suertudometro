/**
 * Un hecho del dominio. Va en pasado, sin sufijo, y con el nombre del event storming
 * (por ejemplo, `UsuarioCreado`).
 *
 * `idEvento` se conserva si el evento sale al bus: es el mismo `idEvento` del envelope,
 * con el que los consumidores descartan duplicados.
 */
export abstract class EventoDeDominio {
  readonly idEvento: string;

  protected constructor(
    readonly ocurridoEn: Date,
    idEvento: string = crypto.randomUUID(),
  ) {
    this.idEvento = idEvento;
  }
}
