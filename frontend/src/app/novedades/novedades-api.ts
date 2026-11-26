import { HttpClient, httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { URL_API } from '../core/api/url-api';

export interface Novedad {
  readonly idActualizacion: string;
  readonly idCampana: string;
  readonly idOrganizador: string;
  readonly contenido: string;
  readonly publicadoEn: string;
}

interface PaginaNovedades {
  readonly total: number;
  readonly resultados: readonly Novedad[];
}

export const TAMANO_PAGINA_NOVEDADES = 20;

@Service()
export class NovedadesApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(URL_API)}/novedades`;

  historial(idCampana: () => string | undefined, pagina: () => number) {
    return httpResource<PaginaNovedades>(() => {
      const id = idCampana();
      return id
        ? {
            url: `${this.url}/campana/${id}`,
            params: {
              limite: TAMANO_PAGINA_NOVEDADES,
              desplazamiento: pagina() * TAMANO_PAGINA_NOVEDADES,
            },
          }
        : undefined;
    });
  }

  publicar(idCampana: string, contenido: string) {
    return this.http.post<Novedad>(this.url, { idCampana, contenido });
  }
}
