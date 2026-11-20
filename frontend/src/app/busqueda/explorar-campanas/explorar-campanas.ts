import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, linkedSignal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { form, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { ActivatedRoute, ParamMap, Router, RouterLink } from '@angular/router';
import {
  CATEGORIAS_CAMPANA,
  ETIQUETA_CATEGORIA,
  ETIQUETA_ESTADO_CAMPANA,
} from '../../campanas/campanas.model';
import { rutaDetalleCampana } from '../../campanas/campanas.routes';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { BusquedaApi } from '../busqueda-api';
import {
  ConsultaCatalogo,
  ESTADOS_CATALOGO,
  FiltrosCatalogo,
  ORDENES_CATALOGO,
  TAMANO_PAGINA,
} from '../busqueda.model';

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

@Component({
  selector: 'app-explorar-campanas',
  imports: [
    CurrencyPipe,
    DecimalPipe,
    FormField,
    MatButton,
    MatFormField,
    MatInput,
    MatLabel,
    MatProgressBar,
    RouterLink,
  ],
  templateUrl: './explorar-campanas.html',
  styleUrl: './explorar-campanas.scss',
})
export class ExplorarCampanas {
  private readonly ruta = inject(ActivatedRoute);
  private readonly router = inject(Router);
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
  protected readonly categorias = CATEGORIAS_CAMPANA;
  protected readonly etiquetaCategoria = ETIQUETA_CATEGORIA;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_CAMPANA;
  protected readonly rutaDetalle = rutaDetalleCampana;
  protected readonly tamanoPagina = TAMANO_PAGINA;
  protected readonly math = Math;

  protected buscar(evento: SubmitEvent): void {
    evento.preventDefault();
    const elegidos = this.filtros();
    const texto = elegidos.texto.trim();
    const filtros: FiltrosCatalogo = {
      ...elegidos,
      texto,
      orden: elegidos.orden === 'relevancia' && !texto ? '' : elegidos.orden,
    };
    this.filtros.set(filtros);
    this.navegar(filtros, 1);
  }

  protected irAPagina(pagina: number): void {
    this.navegar(this.consulta().filtros, pagina);
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
