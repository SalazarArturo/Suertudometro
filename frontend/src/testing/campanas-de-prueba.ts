import {
  DetalleCampanaVista,
  EstadoCampana,
  HistorialEstadoCampana,
  ImagenCampana,
  PaginaDeCampanas,
  ResumenCampanaVista,
  TAMANO_PAGINA_CAMPANAS,
} from '../app/campanas/campanas.model';
import { URL_API_PRUEBA } from './datos-de-prueba';

export const ID_CAMPANA_PRUEBA = '9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d';
export const ID_ORGANIZADOR_PRUEBA = 'e3b68016-9750-41b3-9e34-762dd8346001';
export const ID_IMAGEN_PRUEBA = '11111111-2222-3333-4444-555555555555';

export const IMAGEN_PORTADA_PRUEBA: ImagenCampana = {
  id: ID_IMAGEN_PRUEBA,
  urlPublica: `/api/campanas/${ID_CAMPANA_PRUEBA}/imagenes/${ID_IMAGEN_PRUEBA}`,
  nombreOriginal: 'portada.jpg',
  tipoMime: 'image/jpeg',
  tamanoBytes: 245000,
  orden: 1,
  esPortada: true,
  fechaSubida: '2026-11-10T12:00:00Z',
};

export const CAMPANA_PUBLICADA_PRUEBA: DetalleCampanaVista = {
  id: ID_CAMPANA_PRUEBA,
  idOrganizador: ID_ORGANIZADOR_PRUEBA,
  titulo: 'Libros para la biblioteca comunitaria',
  historia:
    'Queremos ampliar la colección de la biblioteca del barrio con 200 libros nuevos para niños y jóvenes de la comunidad.',
  categoria: 'EDUCACION',
  metaFinanciera: '5000.00',
  montoRecaudado: '1250.00',
  moneda: 'BOB',
  fechaLimite: '2026-12-20T00:00:00Z',
  estado: 'PUBLICADA',
  observacionesRechazo: null,
  motivoCierre: null,
  fechaCreacion: '2026-11-10T10:00:00Z',
  fechaPublicacion: '2026-11-11T10:00:00Z',
  fechaCierre: null,
  imagenes: [IMAGEN_PORTADA_PRUEBA],
};

export const CAMPANA_BORRADOR_PRUEBA: DetalleCampanaVista = {
  ...CAMPANA_PUBLICADA_PRUEBA,
  montoRecaudado: '0.00',
  estado: 'BORRADOR',
  observacionesRechazo: 'Por favor adjunta el presupuesto detallado de la librería.',
  fechaPublicacion: null,
};

export const RESUMEN_CAMPANA_PRUEBA: ResumenCampanaVista = {
  id: ID_CAMPANA_PRUEBA,
  idOrganizador: ID_ORGANIZADOR_PRUEBA,
  titulo: 'Libros para la biblioteca comunitaria',
  categoria: 'EDUCACION',
  metaFinanciera: '5000.00',
  montoRecaudado: '1250.00',
  moneda: 'BOB',
  fechaLimite: '2026-12-20T00:00:00Z',
  estado: 'PUBLICADA',
  urlPortada: IMAGEN_PORTADA_PRUEBA.urlPublica,
  fechaCreacion: '2026-11-10T10:00:00Z',
};

export const HISTORIAL_ESTADOS_PRUEBA: readonly HistorialEstadoCampana[] = [
  {
    id: 'aaaa1111-2222-3333-4444-555555555555',
    estadoAnterior: null,
    estadoNuevo: 'BORRADOR',
    idActor: ID_ORGANIZADOR_PRUEBA,
    motivo: 'Creacion inicial del borrador de campana',
    fechaTransicion: '2026-11-10T10:00:00Z',
  },
  {
    id: 'bbbb1111-2222-3333-4444-555555555555',
    estadoAnterior: 'EN_REVISION',
    estadoNuevo: 'PUBLICADA',
    idActor: ID_ORGANIZADOR_PRUEBA,
    motivo: 'Campana aprobada y publicada por administracion',
    fechaTransicion: '2026-11-11T10:00:00Z',
  },
];

export function paginaCampanasDePrueba(
  elementos: readonly ResumenCampanaVista[],
  pagina = 0,
): PaginaDeCampanas {
  return {
    elementos,
    pagina,
    tamano: TAMANO_PAGINA_CAMPANAS,
    totalElementos: elementos.length,
    totalPaginas: elementos.length > 0 ? 1 : 0,
  };
}

export function urlDetalleCampana(id = ID_CAMPANA_PRUEBA): string {
  return `${URL_API_PRUEBA}/campanas/${id}`;
}

export function urlHistorialEstadosCampana(id = ID_CAMPANA_PRUEBA): string {
  return `${URL_API_PRUEBA}/campanas/${id}/historial-estados`;
}

export function urlMisCampanas(pagina = 0): string {
  return `${URL_API_PRUEBA}/campanas/mias?pagina=${pagina}&tamano=${TAMANO_PAGINA_CAMPANAS}`;
}

export function urlCampanasPorEstado(estado: EstadoCampana = 'EN_REVISION', pagina = 0): string {
  return `${URL_API_PRUEBA}/campanas?estado=${estado}&pagina=${pagina}&tamano=${TAMANO_PAGINA_CAMPANAS}`;
}
