/** Por qué recibe el aviso: porque organiza la campaña o porque aportó. */
export type Papel = 'ORGANIZADOR' | 'APORTANTE';

/** Un importe ya validado por `Dinero`, como se guarda en el contenido. */
export interface Importe {
  readonly monto: string;
  readonly moneda: string;
}

/** Los motivos de cierre que se avisan (R5: META_ALCANZADA no). */
export type MotivoCierreAvisado = 'PLAZO_VENCIDO' | 'CANCELACION';

/** Los datos propios de cada tipo de aviso. Se guardan en una columna JSONB. */
export type ContenidoAviso =
  | { readonly tipo: 'CAMPANA_PUBLICADA'; readonly titulo: string }
  | { readonly tipo: 'CAMPANA_RECHAZADA'; readonly observaciones: string }
  | {
      readonly tipo: 'APORTE_RECIBIDO';
      readonly titulo: string;
      readonly importe: Importe;
      /** R2: `null` si el aporte es anónimo. El id del aportante nunca va aquí. */
      readonly nombreAportante: string | null;
      readonly mensajeApoyo: string | null;
    }
  | {
      readonly tipo: 'META_ALCANZADA';
      readonly titulo: string;
      readonly meta: Importe;
      readonly recaudado: Importe;
      readonly papel: Papel;
    }
  | {
      readonly tipo: 'NOVEDAD_PUBLICADA';
      readonly titulo: string;
      readonly novedad: string;
    }
  | {
      readonly tipo: 'CAMPANA_CERRADA';
      readonly titulo: string;
      readonly motivo: MotivoCierreAvisado;
      readonly papel: Papel;
    };

export type TipoAviso = ContenidoAviso['tipo'];
