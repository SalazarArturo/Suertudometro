/**
 * Error de un caso de uso que no es una regla del dominio (por ejemplo, unas
 * credenciales inválidas). Igual que `ErrorDeDominio`, lleva un código estable
 * en kebab-case ASCII, que la capa api traduce a RFC 9457.
 */
export abstract class ErrorDeAplicacion extends Error {
  protected constructor(
    readonly codigo: string,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}
