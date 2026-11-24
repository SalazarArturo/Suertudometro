import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../core/api/url-api';
import {
  DetalleCampanaVista,
  EstadoCampana,
  GuardarCampanaPeticion,
  HistorialEstadoCampana,
  ImagenCampana,
  PaginaDeCampanas,
  TAMANO_PAGINA_CAMPANAS,
} from './campanas.model';

export type LecturaDetalleCampana = HttpResourceRef<DetalleCampanaVista | undefined>;
export type LecturaPaginaCampanas = HttpResourceRef<PaginaDeCampanas | undefined>;
export type LecturaHistorialEstados = HttpResourceRef<
  readonly HistorialEstadoCampana[] | undefined
>;

/**
 * Cliente HTTP de `campaign-service` a través del gateway (`/api/campanas`).
 *
 * Las lecturas usan `httpResource` y las escrituras `HttpClient` (docs/frontend.md §6).
 */
@Service()
export class CampanasApi {
  private readonly http = inject(HttpClient);
  private readonly urlApi = inject(URL_API);
  private readonly url = `${this.urlApi}/campanas`;
  private readonly origenGateway = new URL(this.urlApi).origin;

  /**
   * Convierte la ruta relativa devuelta por el backend (`/api/campanas/{id}/imagenes/{idImagen}`)
   * en una URL absoluta hacia el API Gateway.
   */
  urlImagen(urlPublica: string): string {
    if (!urlPublica.startsWith('/') || urlPublica.startsWith('//')) {
      return urlPublica;
    }
    return `${this.origenGateway}${urlPublica}`;
  }

  /** Detalle de una campaña (`GET /api/campanas/{id}`). */
  detalleDeCampana(idCampana: () => string | undefined): LecturaDetalleCampana {
    return httpResource<DetalleCampanaVista>(() => {
      const id = idCampana();
      return id ? { url: `${this.url}/${id}` } : undefined;
    });
  }

  /** Historial de estados (`GET /api/campanas/{id}/historial-estados`). */
  historialDeEstados(
    idCampana: () => string | undefined,
    habilitado: () => boolean,
  ): LecturaHistorialEstados {
    return httpResource<readonly HistorialEstadoCampana[]>(() => {
      const id = idCampana();
      return id && habilitado() ? { url: `${this.url}/${id}/historial-estados` } : undefined;
    });
  }

  /** Campañas del organizador autenticado (`GET /api/campanas/mias`). */
  misCampanas(pagina: () => number): LecturaPaginaCampanas {
    return httpResource<PaginaDeCampanas>(() => ({
      url: `${this.url}/mias`,
      params: { pagina: pagina(), tamano: TAMANO_PAGINA_CAMPANAS },
    }));
  }

  /** Bandeja de administración por estado (`GET /api/campanas?estado=`). */
  campanasPorEstado(estado: () => EstadoCampana, pagina: () => number): LecturaPaginaCampanas {
    return httpResource<PaginaDeCampanas>(() => ({
      url: this.url,
      params: { estado: estado(), pagina: pagina(), tamano: TAMANO_PAGINA_CAMPANAS },
    }));
  }

  /** Crea un borrador nuevo (`POST /api/campanas`). */
  crearCampana(peticion: GuardarCampanaPeticion): Observable<DetalleCampanaVista> {
    return this.http.post<DetalleCampanaVista>(this.url, peticion);
  }

  /** Edita los datos de un borrador (`PUT /api/campanas/{id}`). */
  editarBorrador(
    idCampana: string,
    peticion: GuardarCampanaPeticion,
  ): Observable<DetalleCampanaVista> {
    return this.http.put<DetalleCampanaVista>(`${this.url}/${idCampana}`, peticion);
  }

  /** Elimina un borrador (`DELETE /api/campanas/{id}`). */
  eliminarBorrador(idCampana: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${idCampana}`);
  }

  /** Sube una imagen al borrador (`POST /api/campanas/{id}/imagenes`). */
  subirImagen(idCampana: string, archivo: File, esPortada: boolean): Observable<ImagenCampana> {
    const datos = new FormData();
    datos.append('archivo', archivo);
    datos.append('esPortada', String(esPortada));
    return this.http.post<ImagenCampana>(`${this.url}/${idCampana}/imagenes`, datos);
  }

  /** Elimina una imagen del borrador (`DELETE /api/campanas/{id}/imagenes/{idImagen}`). */
  eliminarImagen(idCampana: string, idImagen: string): Observable<void> {
    return this.http.delete<void>(`${this.url}/${idCampana}/imagenes/${idImagen}`);
  }

  /** Envía un borrador a revisión (`POST /api/campanas/{id}/solicitud-revision`). */
  solicitarRevision(idCampana: string): Observable<DetalleCampanaVista> {
    return this.http.post<DetalleCampanaVista>(`${this.url}/${idCampana}/solicitud-revision`, {});
  }

  /** Aprueba y publica una campaña (`POST /api/campanas/{id}/aprobacion`). */
  aprobarCampana(idCampana: string): Observable<DetalleCampanaVista> {
    return this.http.post<DetalleCampanaVista>(`${this.url}/${idCampana}/aprobacion`, {});
  }

  /** Observa/rechaza una campaña en revisión (`POST /api/campanas/{id}/rechazo`). */
  rechazarCampana(idCampana: string, observaciones: string): Observable<DetalleCampanaVista> {
    return this.http.post<DetalleCampanaVista>(`${this.url}/${idCampana}/rechazo`, {
      observaciones,
    });
  }

  /** Cancela una campaña (`POST /api/campanas/{id}/cancelacion`). */
  cancelarCampana(idCampana: string, motivoCancelacion: string): Observable<DetalleCampanaVista> {
    return this.http.post<DetalleCampanaVista>(`${this.url}/${idCampana}/cancelacion`, {
      motivoCancelacion,
    });
  }
}
