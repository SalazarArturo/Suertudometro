import {
  Aviso,
  PaginaDeAvisos,
  TAMANO_DE_PAGINA,
} from '../app/notificaciones/notificaciones.model';
import { URL_API_PRUEBA } from './datos-de-prueba';

// Datos del dominio de notificaciones para las pruebas. No forma parte del build.

export const URL_AVISOS = `${URL_API_PRUEBA}/notificaciones/avisos`;
export const URL_SIN_LEER = `${URL_AVISOS}/no-leidos`;
export const ID_CAMPANA_DEL_AVISO = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

/** URL de la bandeja, como la pide `NotificacionesApi`. */
export function urlBandeja(pagina = 1, soloNoLeidos = false): string {
  return `${URL_AVISOS}?pagina=${pagina}&tamano=${TAMANO_DE_PAGINA}&soloNoLeidos=${soloNoLeidos}`;
}

export const AVISO_SIN_LEER: Aviso = {
  id: '0f8c2f0e-6a0e-4a53-9a51-5f2f0c8f5a11',
  tipo: 'APORTE_RECIBIDO',
  titulo: 'Recibiste un aporte de Bs 150,00',
  mensaje: 'Ana Pérez aportó Bs 150,00 a «Libros para la biblioteca».',
  idCampana: ID_CAMPANA_DEL_AVISO,
  leido: false,
  ocurridoEn: '2026-11-24T15:30:00Z',
};

export const AVISO_LEIDO: Aviso = {
  id: '1a2b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d',
  tipo: 'CAMPANA_PUBLICADA',
  titulo: 'Tu campaña ya está publicada',
  mensaje: '«Libros para la biblioteca» fue aprobada y ya puede recibir aportes.',
  idCampana: ID_CAMPANA_DEL_AVISO,
  leido: true,
  ocurridoEn: '2026-11-23T15:30:00Z',
};

export function paginaDeAvisos(
  elementos: readonly Aviso[],
  pagina = 1,
  totalPaginas = elementos.length === 0 ? 0 : 1,
): PaginaDeAvisos {
  return {
    elementos,
    pagina,
    tamano: TAMANO_DE_PAGINA,
    totalElementos: totalPaginas <= 1 ? elementos.length : totalPaginas * TAMANO_DE_PAGINA,
    totalPaginas,
  };
}
