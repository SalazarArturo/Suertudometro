import { HttpClient, httpResource, HttpResourceRef } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable } from 'rxjs';
import { URL_API } from '../core/api/url-api';
import {
  AporteCreado,
  PaginaDeAportes,
  RealizarAportePeticion,
  TAMANO_DE_PAGINA,
} from './aportes.model';

/** Una lectura paginada de aportes. Se vuelve a pedir sola cuando cambia la página. */
export type LecturaDeAportes = HttpResourceRef<PaginaDeAportes | undefined>;

/**
 * Endpoints de contribution-service, siempre a través del gateway (`/api/aportes`).
 *
 * Las lecturas son `httpResource`: se crean en un contexto de inyección (el
 * inicializador de un campo del componente) y reciben funciones, para que la
 * petición se repita cuando cambia la campaña o la página.
 */
@Service()
export class AportesApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(URL_API)}/aportes`;

  /** Registra un aporte simulado. Requiere sesión. */
  realizarAporte(peticion: RealizarAportePeticion): Observable<AporteCreado> {
    return this.http.post<AporteCreado>(this.url, peticion);
  }

  /** Historial público de una campaña: los aportes anónimos llegan sin nombre. */
  historialDeCampana(idCampana: () => string, pagina: () => number): LecturaDeAportes {
    return httpResource<PaginaDeAportes>(() => ({
      url: this.url,
      params: { idCampana: idCampana(), pagina: pagina(), tamano: TAMANO_DE_PAGINA },
    }));
  }

  /** "Mis aportes": los de quien tiene la sesión. */
  misAportes(pagina: () => number): LecturaDeAportes {
    return httpResource<PaginaDeAportes>(() => ({
      url: `${this.url}/mios`,
      params: { pagina: pagina(), tamano: TAMANO_DE_PAGINA },
    }));
  }

  /** Aportes recibidos de una campaña: solo para su organizador o la administración. */
  aportesRecibidos(idCampana: () => string, pagina: () => number): LecturaDeAportes {
    return httpResource<PaginaDeAportes>(() => ({
      url: `${this.url}/recibidos`,
      params: { idCampana: idCampana(), pagina: pagina(), tamano: TAMANO_DE_PAGINA },
    }));
  }
}
