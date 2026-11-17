// Contratos de contribution-service (docs/servicios/contribution-service.md §5).

/** Moneda única de la versión 1. */
export const MONEDA = 'BOB';

/** Largo máximo del mensaje de apoyo (regla R4). */
export const LARGO_MAXIMO_MENSAJE = 300;

/** Cuántos aportes se piden por página. */
export const TAMANO_DE_PAGINA = 10;

/** Cuerpo de `POST /api/aportes`. */
export interface RealizarAportePeticion {
  readonly idCampana: string;
  /** El dinero viaja como texto con punto decimal: `"150.00"`. */
  readonly monto: string;
  readonly moneda: string;
  /** `null` si el aporte no lleva mensaje. */
  readonly mensajeApoyo: string | null;
  readonly esAnonimo: boolean;
}

/** Respuesta de `POST /api/aportes`. */
export interface AporteCreado {
  readonly idAporte: string;
}

/** Un aporte, como lo devuelven las consultas. */
export interface Aporte {
  readonly idAporte: string;
  readonly idCampana: string;
  readonly tituloCampana: string | null;
  /** Texto con dos decimales: `"150.00"`. Se muestra, no se calcula. */
  readonly monto: string;
  readonly moneda: string;
  readonly esAnonimo: boolean;
  /** `null` si el aporte es anónimo. */
  readonly nombreAportante: string | null;
  /** `null` si el aporte no lleva mensaje. */
  readonly mensajeApoyo: string | null;
  /** Instante ISO 8601 en UTC. */
  readonly registradoEn: string;
}

/** Una página de aportes, del más reciente al más antiguo. */
export interface PaginaDeAportes {
  readonly elementos: readonly Aporte[];
  /** Número de página, desde 1. */
  readonly pagina: number;
  readonly tamano: number;
  readonly totalElementos: number;
  readonly totalPaginas: number;
}
