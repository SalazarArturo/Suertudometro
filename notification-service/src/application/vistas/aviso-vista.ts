import type { TipoAviso } from '../../domain/aviso/contenido-aviso.js';

/** Los valores posibles de `AvisoVista.tipo`, para documentarlos en la API. */
export const TIPOS_AVISO = [
  'CAMPANA_PUBLICADA',
  'CAMPANA_RECHAZADA',
  'APORTE_RECIBIDO',
  'META_ALCANZADA',
  'NOVEDAD_PUBLICADA',
  'CAMPANA_CERRADA',
] as const satisfies readonly TipoAviso[];

/** Un aviso como lo ve su destinatario en la bandeja. */
export interface AvisoVista {
  readonly id: string;
  readonly tipo: (typeof TIPOS_AVISO)[number];
  readonly titulo: string;
  readonly mensaje: string;
  readonly idCampana: string;
  readonly leido: boolean;
  readonly ocurridoEn: Date;
}
