import { Component, computed, DOCUMENT, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import { CATEGORIAS_CAMPANA, CategoriaCampana } from '../../campanas/campanas.model';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { BusquedaApi } from '../busqueda-api';
import {
  ConsultaCatalogo,
  EstadoCatalogo,
  ESTADOS_CATALOGO,
  FiltrosCatalogo,
  ORDENES_CATALOGO,
  TAMANO_PAGINA,
} from '../busqueda.model';
import { ComoFunciona } from '../como-funciona/como-funciona';
import { NuestrasCausas } from '../nuestras-causas/nuestras-causas';
import { TarjetaCampana } from '../tarjeta-campana/tarjeta-campana';

type Orden = (typeof ORDENES_CATALOGO)[number];

function leerConsulta(parametros: ParamMap): ConsultaCatalogo {
  const texto = parametros.get('texto')?.trim() ?? '';
  const orden = ORDENES_CATALOGO.find((valor) => valor === parametros.get('orden')) ?? '';
  const pagina = Number(parametros.get('pagina'));
  return {
    filtros: {
      texto,
      categoria:
        CATEGORIAS_CAMPANA.find((opcion) => opcion.codigo === parametros.get('categoria'))
          ?.codigo ?? '',
      estado: ESTADOS_CATALOGO.find((valor) => valor === parametros.get('estado')) ?? 'PUBLICADA',
      orden: orden === 'relevancia' && !texto ? '' : orden,
    },
    pagina:
      pagina > 0 && Number.isInteger(pagina) && Number.isSafeInteger(pagina * TAMANO_PAGINA)
        ? pagina
        : 1,
  };
}

/**
 * Portada pública: el cartel del afiche con el buscador y las categorías, el
 * catálogo de Búsqueda, cómo funciona y las causas. Los filtros, el orden y la
 * página van en la URL.
 */
@Component({
  selector: 'app-explorar-campanas',
  imports: [
    ComoFunciona,
    FormField,
    MatButton,
    MatIcon,
    MatProgressBar,
    NuestrasCausas,
    RouterLink,
    TarjetaCampana,
  ],
  templateUrl: './explorar-campanas.html',
  styleUrl: './explorar-campanas.scss',
})
export class ExplorarCampanas {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly documento = inject(DOCUMENT);
  protected readonly api = inject(BusquedaApi);
  private readonly parametros = toSignal(this.ruta.queryParamMap, {
    initialValue: this.ruta.snapshot.queryParamMap,
  });
  protected readonly consulta = computed(() => leerConsulta(this.parametros()));
  protected readonly filtros = linkedSignal(() => this.consulta().filtros);
  protected readonly formulario = form(this.filtros);
  protected readonly catalogo = this.api.buscar(this.consulta);
  protected readonly error = computed(() => {
    const causa = this.catalogo.error();
    return causa ? leerErrorDeApi(causa).detalle : undefined;
  });
  /** Sin orden elegido, Búsqueda ordena por relevancia si hay texto y por fecha si no. */
  protected readonly ordenEfectivo = computed<Orden>(() => {
    const { orden, texto } = this.consulta().filtros;
    return orden || (texto ? 'relevancia' : 'recientes');
  });
  protected readonly hayFiltros = computed(() => {
    const { texto, categoria, estado } = this.consulta().filtros;
    return !!texto || !!categoria || estado !== 'PUBLICADA';
  });
  protected readonly categorias = CATEGORIAS_CAMPANA;
  protected readonly ordenes: readonly { valor: Orden; texto: string }[] = [
    { valor: 'recientes', texto: 'Más recientes' },
    { valor: 'popularidad', texto: 'Más aportes' },
    { valor: 'relevancia', texto: 'Relevancia' },
  ];
  protected readonly estados: readonly { valor: EstadoCatalogo; texto: string }[] = [
    { valor: 'PUBLICADA', texto: 'Publicadas' },
    { valor: 'FINALIZADA', texto: 'Finalizadas' },
    { valor: 'CANCELADA', texto: 'Canceladas' },
    { valor: 'TODOS', texto: 'Todos los estados' },
  ];
  protected readonly tamanoPagina = TAMANO_PAGINA;
  protected readonly math = Math;

  protected buscar(evento: SubmitEvent): void {
    evento.preventDefault();
    this.aplicar({});
  }

  protected elegirCategoria(categoria: CategoriaCampana | ''): void {
    this.aplicar({ categoria });
  }

  /** Desde «Nuestras causas», al pie: filtra y lleva a los resultados. */
  protected verCausa(categoria: CategoriaCampana): void {
    this.aplicar({ categoria });
    this.documento.getElementById('titulo-campanas')?.focus();
  }

  protected elegirOrden(orden: Orden): void {
    this.aplicar({ orden });
  }

  protected elegirEstado(evento: Event): void {
    const valor = (evento.target as HTMLSelectElement).value;
    const estado = ESTADOS_CATALOGO.find((opcion) => opcion === valor);
    if (estado) {
      this.aplicar({ estado });
    }
  }

  protected irAPagina(pagina: number): void {
    this.navegar(this.consulta().filtros, pagina);
  }

  /** Una búsqueda nueva, con lo escrito en el buscador: vuelve a la primera página. */
  private aplicar(cambios: Partial<FiltrosCatalogo>): void {
    const elegidos = { ...this.filtros(), ...cambios };
    const texto = elegidos.texto.trim();
    const filtros: FiltrosCatalogo = {
      ...elegidos,
      texto,
      orden: elegidos.orden === 'relevancia' && !texto ? '' : elegidos.orden,
    };
    this.filtros.set(filtros);
    this.navegar(filtros, 1);
  }

  private navegar(filtros: FiltrosCatalogo, pagina: number): void {
    void this.router.navigate([], {
      relativeTo: this.ruta,
      queryParams: {
        texto: filtros.texto || null,
        categoria: filtros.categoria || null,
        estado: filtros.estado === 'PUBLICADA' ? null : filtros.estado,
        orden: filtros.orden || null,
        pagina: pagina === 1 ? null : pagina,
      },
    });
  }
}
