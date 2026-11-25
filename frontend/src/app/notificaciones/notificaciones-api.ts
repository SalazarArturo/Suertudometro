import { HttpClient, HttpContext, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../core/api/url-api';
import { EN_SEGUNDO_PLANO } from '../core/http/en-segundo-plano';
import { CantidadSinLeer, PaginaDeAvisos, TAMANO_DE_PAGINA } from './notificaciones.model';

/**
 * Endpoints de notification-service, siempre a través del gateway
 * (`/api/notificaciones`). Todos requieren sesión y solo tratan con los avisos
 * propios.
 */
@Service()
export class NotificacionesApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(URL_API)}/notificaciones/avisos`;

  /** La bandeja. Se vuelve a pedir sola cuando cambia la página o el filtro. */
  avisos(
    pagina: () => number,
    soloNoLeidos: () => boolean,
  ): HttpResourceRef<PaginaDeAvisos | undefined> {
    return httpResource<PaginaDeAvisos>(() => ({
      url: this.url,
      params: { pagina: pagina(), tamano: TAMANO_DE_PAGINA, soloNoLeidos: soloNoLeidos() },
    }));
  }

  /**
   * Cuántos avisos están sin leer. Sin token no pide nada, y con otro token pide de
   * nuevo. Se pregunta sola cada tanto, así que va en segundo plano.
   */
  cantidadSinLeer(token: () => string | undefined): HttpResourceRef<CantidadSinLeer | undefined> {
    return httpResource<CantidadSinLeer>(() =>
      token() === undefined
        ? undefined
        : {
            url: `${this.url}/no-leidos`,
            context: new HttpContext().set(EN_SEGUNDO_PLANO, true),
          },
    );
  }

  marcarLeido(idAviso: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${idAviso}/lectura`, null);
  }

  marcarTodosLeidos(): Observable<void> {
    return this.http.post<void>(`${this.url}/lectura`, null);
  }
}
