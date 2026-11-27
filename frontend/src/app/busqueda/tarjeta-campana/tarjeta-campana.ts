import { CurrencyPipe, DecimalPipe, LowerCasePipe } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { ETIQUETA_CATEGORIA, ETIQUETA_ESTADO_CAMPANA } from '../../campanas/campanas.model';
import { rutaDetalleCampana } from '../../campanas/campanas.routes';
import { FichaCatalogo } from '../busqueda.model';

/**
 * Una campaña del catálogo, como una foto con marco del afiche: la portada en un
 * marco rojo (azul si llegó a la meta) con la categoría encima, el título, el
 * resumen y el avance. Toda la tarjeta lleva al detalle.
 */
@Component({
  selector: 'app-tarjeta-campana',
  imports: [CurrencyPipe, DecimalPipe, LowerCasePipe, MatProgressBar, RouterLink],
  templateUrl: './tarjeta-campana.html',
  styleUrl: './tarjeta-campana.scss',
})
export class TarjetaCampana {
  readonly ficha = input.required<FichaCatalogo>();
  /** URL de la portada en el gateway, o nada si la ruta no es válida. */
  readonly portada = input<string>();

  protected readonly etiquetaCategoria = ETIQUETA_CATEGORIA;
  protected readonly etiquetaEstado = ETIQUETA_ESTADO_CAMPANA;
  protected readonly rutaDetalle = rutaDetalleCampana;
  /** Si la recaudación supera la meta, la barra se detiene en el 100 %. */
  protected readonly avance = computed(() => Math.min(100, this.ficha().porcentajeAvance));
}
