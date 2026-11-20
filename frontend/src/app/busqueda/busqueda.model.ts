import type { CategoriaCampana } from '../campanas/campanas.model';

export const TAMANO_PAGINA = 20;
export const ESTADOS_CATALOGO = ['PUBLICADA', 'FINALIZADA', 'CANCELADA', 'TODOS'] as const;
export const ORDENES_CATALOGO = ['recientes', 'popularidad', 'relevancia'] as const;
export type EstadoCatalogo = (typeof ESTADOS_CATALOGO)[number];

export interface FiltrosCatalogo {
  texto: string;
  categoria: CategoriaCampana | '';
  estado: EstadoCatalogo;
  orden: (typeof ORDENES_CATALOGO)[number] | '';
}

export interface ConsultaCatalogo {
  filtros: FiltrosCatalogo;
  pagina: number;
}

export interface FichaCatalogo {
  idCampana: string;
  titulo: string;
  resumen: string;
  categoria: CategoriaCampana;
  rutaPortada: string;
  estado: Exclude<EstadoCatalogo, 'TODOS'>;
  metaFinanciera: string;
  montoRecaudado: string;
  moneda: string;
  fechaLimite: string;
  publicadoEn: string;
  porcentajeAvance: number;
  cantidadAportes: number;
  metaAlcanzada: boolean;
}

export interface PaginaCatalogo {
  total: number;
  resultados: readonly FichaCatalogo[];
}
