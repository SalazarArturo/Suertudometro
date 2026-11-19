// Contratos de campaign-service (docs/servicios/campaign-service.md §2 a §5).

/** Moneda única en la versión 1. */
export const MONEDA_CAMPANA = 'BOB';

/** Meta financiera mínima en BOB (regla R4). */
export const META_MINIMA_BOB = 100;

/** Límites de caracteres (reglas R1, R2 y R8). */
export const LARGO_MINIMO_TITULO = 10;
export const LARGO_MAXIMO_TITULO = 120;
export const LARGO_MINIMO_HISTORIA = 50;
export const LARGO_MAXIMO_HISTORIA = 5000;
export const LARGO_MINIMO_OBSERVACION = 10;

/** Límite de imágenes por campaña (regla R6). */
export const MAXIMO_IMAGENES_CAMPANA = 5;

/** Tamaño de página por defecto para listados de campañas. */
export const TAMANO_PAGINA_CAMPANAS = 10;

/** Categorías oficiales del dominio (regla R3). */
export type CategoriaCampana =
  'EDUCACION' | 'SALUD' | 'APOYO_COMUNITARIO' | 'EMERGENCIAS' | 'PROYECTOS_PERSONALES' | 'OTROS';

export interface OpcionCategoriaCampana {
  readonly codigo: CategoriaCampana;
  readonly etiqueta: string;
}

export const CATEGORIAS_CAMPANA: readonly OpcionCategoriaCampana[] = [
  { codigo: 'EDUCACION', etiqueta: 'Educación' },
  { codigo: 'SALUD', etiqueta: 'Salud' },
  { codigo: 'APOYO_COMUNITARIO', etiqueta: 'Apoyo comunitario' },
  { codigo: 'EMERGENCIAS', etiqueta: 'Emergencias' },
  { codigo: 'PROYECTOS_PERSONALES', etiqueta: 'Proyectos personales' },
  { codigo: 'OTROS', etiqueta: 'Otros' },
];

export const ETIQUETA_CATEGORIA: Readonly<Record<CategoriaCampana, string>> = {
  EDUCACION: 'Educación',
  SALUD: 'Salud',
  APOYO_COMUNITARIO: 'Apoyo comunitario',
  EMERGENCIAS: 'Emergencias',
  PROYECTOS_PERSONALES: 'Proyectos personales',
  OTROS: 'Otros',
};

/** Estados posibles del ciclo de vida de una campaña. */
export type EstadoCampana = 'BORRADOR' | 'EN_REVISION' | 'PUBLICADA' | 'FINALIZADA' | 'CANCELADA';

export const ETIQUETA_ESTADO_CAMPANA: Readonly<Record<EstadoCampana, string>> = {
  BORRADOR: 'Borrador',
  EN_REVISION: 'En revisión',
  PUBLICADA: 'Publicada',
  FINALIZADA: 'Finalizada',
  CANCELADA: 'Cancelada',
};

/** Motivos de cierre definitivo (ADR 0003). */
export type MotivoCierreCampana = 'META_ALCANZADA' | 'PLAZO_VENCIDO' | 'CANCELACION';

export const ETIQUETA_MOTIVO_CIERRE: Readonly<Record<MotivoCierreCampana, string>> = {
  META_ALCANZADA: 'Meta financiera alcanzada',
  PLAZO_VENCIDO: 'Plazo de recaudación vencido',
  CANCELACION: 'Cancelada',
};

/** Metadatos de una imagen asociada a una campaña. */
export interface ImagenCampana {
  readonly id: string;
  readonly urlPublica: string;
  readonly nombreOriginal: string;
  readonly tipoMime: string;
  readonly tamanoBytes: number;
  readonly orden: number;
  readonly esPortada: boolean;
  readonly fechaSubida: string;
}

/** Entrada del historial de cambios de estado de una campaña. */
export interface HistorialEstadoCampana {
  readonly id: string;
  readonly estadoAnterior: EstadoCampana | null;
  readonly estadoNuevo: EstadoCampana;
  readonly idActor: string | null;
  readonly motivo: string;
  readonly fechaTransicion: string;
}

/** Vista completa de una campaña (`GET /api/campanas/{id}`). */
export interface DetalleCampanaVista {
  readonly id: string;
  readonly idOrganizador: string;
  readonly titulo: string;
  readonly historia: string;
  readonly categoria: CategoriaCampana;
  readonly metaFinanciera: string;
  readonly montoRecaudado: string;
  readonly moneda: string;
  readonly fechaLimite: string;
  readonly estado: EstadoCampana;
  readonly observacionesRechazo: string | null;
  readonly motivoCierre: MotivoCierreCampana | null;
  readonly fechaCreacion: string;
  readonly fechaPublicacion: string | null;
  readonly fechaCierre: string | null;
  readonly imagenes: readonly ImagenCampana[];
}

/** Resumen de campaña en listados paginados. */
export interface ResumenCampanaVista {
  readonly id: string;
  readonly idOrganizador: string;
  readonly titulo: string;
  readonly categoria: CategoriaCampana;
  readonly metaFinanciera: string;
  readonly montoRecaudado: string;
  readonly moneda: string;
  readonly fechaLimite: string;
  readonly estado: EstadoCampana;
  readonly urlPortada: string | null;
  readonly fechaCreacion: string;
}

/** Respuesta paginada de `campaign-service` (`pagina` basada en 0). */
export interface PaginaDeCampanas {
  readonly elementos: readonly ResumenCampanaVista[];
  readonly pagina: number;
  readonly tamano: number;
  readonly totalElementos: number;
  readonly totalPaginas: number;
}

/** Cuerpo de `POST /api/campanas` y `PUT /api/campanas/{id}`. */
export interface GuardarCampanaPeticion {
  readonly titulo: string;
  readonly historia: string;
  readonly categoria: CategoriaCampana;
  readonly metaFinanciera: string;
  readonly moneda: string;
  readonly fechaLimite: string;
}

/** Calcula el porcentaje de avance (0 a 100) solo para la barra visual de progreso. */
export function calcularPorcentajeAvance(montoRecaudado: string, metaFinanciera: string): number {
  const recaudado = Number(montoRecaudado);
  const meta = Number(metaFinanciera);
  if (!Number.isFinite(recaudado) || !Number.isFinite(meta) || meta <= 0 || recaudado <= 0) {
    return 0;
  }
  return Math.min(100, Math.round((recaudado / meta) * 100));
}
