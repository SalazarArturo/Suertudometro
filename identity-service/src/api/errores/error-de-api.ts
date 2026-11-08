import { HttpStatus } from '@nestjs/common';

/**
 * Error del borde HTTP, que no viene del dominio ni de un caso de uso: la
 * petición no tiene la forma esperada o le falta la identidad. Lleva su propio
 * estado, así que no pasa por el catálogo de errores.
 */
export abstract class ErrorDeApi extends Error {
  protected constructor(
    readonly codigo: string,
    readonly estado: HttpStatus,
    mensaje: string,
  ) {
    super(mensaje);
    this.name = new.target.name;
  }
}

/**
 * La ruta requiere sesión y faltan los headers `X-Usuario-*` que pone el
 * gateway, o no se pueden leer (docs/servicios/identity-service.md §5.1).
 */
export class NoAutenticado extends ErrorDeApi {
  constructor(motivo: string) {
    super(
      'no-autenticado',
      HttpStatus.UNAUTHORIZED,
      `Hace falta iniciar sesión: ${motivo}`,
    );
  }
}
