import { ErrorDeDominio } from './error-de-dominio.js';

/**
 * Una invariante del dominio, declarada y probada por separado,
 * como en el repositorio de referencia del docente.
 */
export interface ReglaDeNegocio {
  /** Código estable en kebab-case ASCII; forma el `type` del error RFC 9457. */
  readonly codigo: string;
  /** Explicación para personas; puede llevar tildes. */
  readonly mensaje: string;
  seIncumple(): boolean;
}

export class ReglaDeNegocioIncumplida extends ErrorDeDominio {
  constructor(readonly regla: ReglaDeNegocio) {
    super(regla.codigo, regla.mensaje);
  }
}

/** Lanza `ReglaDeNegocioIncumplida` si la regla no se cumple. */
export function verificarRegla(regla: ReglaDeNegocio): void {
  if (regla.seIncumple()) {
    throw new ReglaDeNegocioIncumplida(regla);
  }
}
