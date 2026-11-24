/**
 * Los eventos que consume este servicio, ya validados y con solo los campos que
 * usa de cada ficha (docs/contratos-de-eventos.md).
 */
interface Evento<TTipo extends string, TDatos> {
  readonly idEvento: string;
  readonly tipo: TTipo;
  readonly ocurridoEn: Date;
  readonly datos: TDatos;
}

export type UsuarioRegistrado = Evento<
  'usuario.registrado',
  { readonly idUsuario: string; readonly correo: string }
>;

export type CampanaPublicada = Evento<
  'campana.publicada',
  {
    readonly idCampana: string;
    readonly idOrganizador: string;
    readonly titulo: string;
  }
>;

export type CampanaRechazada = Evento<
  'campana.rechazada',
  {
    readonly idCampana: string;
    readonly idOrganizador: string;
    readonly observaciones: string;
  }
>;

export type AporteRegistrado = Evento<
  'aporte.registrado',
  {
    readonly idCampana: string;
    readonly idAportante: string;
    readonly monto: string;
    readonly moneda: string;
    readonly esAnonimo: boolean;
    readonly nombreAportante: string | null;
    readonly mensajeApoyo: string | null;
  }
>;

export type MetaAlcanzada = Evento<
  'meta.alcanzada',
  {
    readonly idCampana: string;
    readonly metaFinanciera: string;
    readonly montoRecaudado: string;
    readonly moneda: string;
  }
>;

export type CampanaActualizada = Evento<
  'campana.actualizada',
  { readonly idCampana: string; readonly contenido: string }
>;

export type MotivoCierre = 'META_ALCANZADA' | 'PLAZO_VENCIDO' | 'CANCELACION';

export type CampanaCerrada = Evento<
  'campana.cerrada',
  { readonly idCampana: string; readonly motivoCierre: MotivoCierre }
>;

/** Los que solo se pueden atender si ya se conoce la campaña (R6). */
export type EventoDeCampanaConocida =
  AporteRegistrado | MetaAlcanzada | CampanaActualizada | CampanaCerrada;

export type EventoIntegracion =
  | UsuarioRegistrado
  | CampanaPublicada
  | CampanaRechazada
  | EventoDeCampanaConocida;

export type TipoEvento = EventoIntegracion['tipo'];
