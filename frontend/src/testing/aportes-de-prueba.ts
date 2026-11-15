import { Aporte, PaginaDeAportes, TAMANO_DE_PAGINA } from '../app/aportes/aportes.model';
import { URL_API_PRUEBA } from './datos-de-prueba';

// Datos del dominio de aportes para las pruebas. No forma parte del build de la aplicación.

export const URL_APORTES = `${URL_API_PRUEBA}/aportes`;

export const ID_CAMPANA_DE_PRUEBA = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';

/** URL del historial público de la campaña de prueba, como la pide `AportesApi`. */
export function urlHistorial(pagina = 1): string {
  return `${URL_APORTES}?idCampana=${ID_CAMPANA_DE_PRUEBA}&pagina=${pagina}&tamano=${TAMANO_DE_PAGINA}`;
}

/** URL de "Mis aportes". */
export function urlMisAportes(pagina = 1): string {
  return `${URL_APORTES}/mios?pagina=${pagina}&tamano=${TAMANO_DE_PAGINA}`;
}

/** URL de los aportes recibidos de la campaña de prueba. */
export function urlAportesRecibidos(pagina = 1): string {
  return `${URL_APORTES}/recibidos?idCampana=${ID_CAMPANA_DE_PRUEBA}&pagina=${pagina}&tamano=${TAMANO_DE_PAGINA}`;
}

/** Un aporte con nombre y mensaje. La hora es del mediodía UTC: el día no cambia con la zona horaria. */
export const APORTE_CON_NOMBRE: Aporte = {
  idAporte: '5fb46893-a255-4614-83eb-9d64ec0a4432',
  idCampana: ID_CAMPANA_DE_PRUEBA,
  tituloCampana: 'Libros para la biblioteca',
  monto: '150.00',
  moneda: 'BOB',
  esAnonimo: false,
  nombreAportante: 'Ana Pérez',
  mensajeApoyo: '¡Mucho éxito con la campaña!',
  registradoEn: '2026-11-14T15:30:00Z',
};

/** Un aporte anónimo y sin mensaje: el API manda el nombre en `null`. */
export const APORTE_ANONIMO: Aporte = {
  idAporte: '0e903b45-0518-471b-af10-f5706b5409b3',
  idCampana: ID_CAMPANA_DE_PRUEBA,
  tituloCampana: 'Libros para la biblioteca',
  monto: '20.50',
  moneda: 'BOB',
  esAnonimo: true,
  nombreAportante: null,
  mensajeApoyo: null,
  registradoEn: '2026-11-13T15:30:00Z',
};

/** Una página de aportes como la devuelve contribution-service. */
export function paginaDePrueba(
  elementos: readonly Aporte[],
  pagina = 1,
  totalPaginas = elementos.length === 0 ? 0 : 1,
): PaginaDeAportes {
  return {
    elementos,
    pagina,
    tamano: TAMANO_DE_PAGINA,
    totalElementos: totalPaginas <= 1 ? elementos.length : totalPaginas * TAMANO_DE_PAGINA,
    totalPaginas,
  };
}
