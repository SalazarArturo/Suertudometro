import { httpResource } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { URL_API } from '../core/api/url-api';
import { ConsultaCatalogo, PaginaCatalogo, TAMANO_PAGINA } from './busqueda.model';

@Service()
export class BusquedaApi {
  private readonly urlApi = inject(URL_API);
  private readonly origenGateway = new URL(this.urlApi).origin;

  buscar(consulta: () => ConsultaCatalogo) {
    return httpResource<PaginaCatalogo>(() => {
      const { filtros, pagina } = consulta();
      return {
        url: `${this.urlApi}/busqueda`,
        params: {
          estado: filtros.estado,
          limite: TAMANO_PAGINA,
          desplazamiento: (pagina - 1) * TAMANO_PAGINA,
          ...(filtros.texto && { texto: filtros.texto }),
          ...(filtros.categoria && { categoria: filtros.categoria }),
          ...(filtros.orden && { orden: filtros.orden }),
        },
      };
    });
  }

  urlPortada(ruta: string): string | undefined {
    if (!ruta?.startsWith('/') || ruta.startsWith('//')) return undefined;
    return `${this.origenGateway}${ruta}`;
  }
}
