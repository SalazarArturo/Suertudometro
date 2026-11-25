import { randomUUID } from 'node:crypto';
import type {
  AporteRegistrado,
  CampanaActualizada,
  CampanaCerrada,
  CampanaPublicada,
  CampanaRechazada,
  MetaAlcanzada,
  UsuarioRegistrado,
} from '../../src/application/eventos/evento-integracion.js';

// Personas y campaña fijas, para leer las pruebas con facilidad.
export const OLGA = 'e3b68016-9750-41b3-9e34-762dd8346001';
export const ANA = 'dcfce0af-9a86-4d5c-b79a-4c4e206754f0';
export const BETO = '7a1c2f10-3f5e-4c8e-9d0a-1b2c3d4e5f60';
export const CAMPANA = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
export const TITULO = 'Libros para la biblioteca';

const base = (minuto: number) => ({
  idEvento: randomUUID(),
  ocurridoEn: new Date(Date.UTC(2026, 10, 24, 15, minuto)),
});

export const usuarioRegistrado = (
  idUsuario: string,
  correo: string,
): UsuarioRegistrado => ({
  ...base(0),
  tipo: 'usuario.registrado',
  datos: { idUsuario, correo },
});

export const campanaPublicada = (
  datos: Partial<CampanaPublicada['datos']> = {},
): CampanaPublicada => ({
  ...base(1),
  tipo: 'campana.publicada',
  datos: {
    idCampana: CAMPANA,
    idOrganizador: OLGA,
    titulo: TITULO,
    ...datos,
  },
});

export const campanaRechazada = (): CampanaRechazada => ({
  ...base(1),
  tipo: 'campana.rechazada',
  datos: {
    idCampana: CAMPANA,
    idOrganizador: OLGA,
    observaciones: 'Aclara cómo se usarán los fondos.',
  },
});

export const aporteRegistrado = (
  datos: Partial<AporteRegistrado['datos']> = {},
  minuto = 2,
): AporteRegistrado => ({
  ...base(minuto),
  tipo: 'aporte.registrado',
  datos: {
    idCampana: CAMPANA,
    idAportante: ANA,
    monto: '150.00',
    moneda: 'BOB',
    esAnonimo: false,
    nombreAportante: 'Ana Pérez',
    mensajeApoyo: '¡Mucho éxito!',
    ...datos,
  },
});

export const aporteAnonimo = (
  idAportante: string,
  minuto = 2,
): AporteRegistrado =>
  aporteRegistrado(
    {
      idAportante,
      esAnonimo: true,
      nombreAportante: null,
      mensajeApoyo: null,
    },
    minuto,
  );

export const metaAlcanzada = (minuto = 5): MetaAlcanzada => ({
  ...base(minuto),
  tipo: 'meta.alcanzada',
  datos: {
    idCampana: CAMPANA,
    metaFinanciera: '5000.00',
    montoRecaudado: '5050.00',
    moneda: 'BOB',
  },
});

export const campanaActualizada = (minuto = 4): CampanaActualizada => ({
  ...base(minuto),
  tipo: 'campana.actualizada',
  datos: {
    idCampana: CAMPANA,
    contenido: 'Ya recibimos la primera caja de libros.',
  },
});

export const campanaCerrada = (
  motivoCierre: CampanaCerrada['datos']['motivoCierre'],
  minuto = 6,
): CampanaCerrada => ({
  ...base(minuto),
  tipo: 'campana.cerrada',
  datos: { idCampana: CAMPANA, motivoCierre },
});
