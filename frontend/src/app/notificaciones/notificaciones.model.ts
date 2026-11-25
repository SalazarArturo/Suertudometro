// Contratos de notification-service (docs/servicios/notification-service.md §5).

/** Cuántos avisos se piden por página. */
export const TAMANO_DE_PAGINA = 10;

export type TipoAviso =
  | 'CAMPANA_PUBLICADA'
  | 'CAMPANA_RECHAZADA'
  | 'APORTE_RECIBIDO'
  | 'META_ALCANZADA'
  | 'NOVEDAD_PUBLICADA'
  | 'CAMPANA_CERRADA';

/** Un aviso de la bandeja. El título y el mensaje llegan redactados. */
export interface Aviso {
  readonly id: string;
  readonly tipo: TipoAviso;
  readonly titulo: string;
  readonly mensaje: string;
  readonly idCampana: string;
  readonly leido: boolean;
  /** Instante ISO 8601 en UTC. */
  readonly ocurridoEn: string;
}

/** Una página de avisos, del más nuevo al más antiguo. */
export interface PaginaDeAvisos {
  readonly elementos: readonly Aviso[];
  /** Número de página, desde 1. */
  readonly pagina: number;
  readonly tamano: number;
  readonly totalElementos: number;
  readonly totalPaginas: number;
}

/** Respuesta de `GET /api/notificaciones/avisos/no-leidos`. */
export interface CantidadSinLeer {
  readonly cantidad: number;
}

const ICONOS: Readonly<Record<TipoAviso, string>> = {
  CAMPANA_PUBLICADA: 'campaign',
  CAMPANA_RECHAZADA: 'rate_review',
  APORTE_RECIBIDO: 'volunteer_activism',
  META_ALCANZADA: 'emoji_events',
  NOVEDAD_PUBLICADA: 'newspaper',
  CAMPANA_CERRADA: 'event_busy',
};

/** El ícono de un aviso. Uno genérico si el servicio agrega un tipo que aquí no se conoce. */
export function iconoDelAviso(tipo: string): string {
  return ICONOS[tipo as TipoAviso] ?? 'notifications';
}
