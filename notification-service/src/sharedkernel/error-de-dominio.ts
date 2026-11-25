/**
 * Error de negocio con un código estable, en kebab-case ASCII.
 *
 * La capa api lo traduce a RFC 9457: el código forma el `type`
 * (`https://api.suertudometro.com/errores/<codigo>`) y el mensaje va en `detail`,
 * así que puede llevar tildes.
 */
export abstract class ErrorDeDominio extends Error {
  protected constructor(
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}
