import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, input, model } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { LecturaDeAportes } from '../aportes-api';
import { rutaDeCampana } from '../aportes.routes';

/**
 * Lista paginada de aportes. La comparten el historial de una campaña, "Mis
 * aportes" y "Aportes recibidos": cada pantalla crea su lectura y esta lista se
 * ocupa de mostrar la carga, el error, la lista vacía y las páginas.
 */
@Component({
  selector: 'app-lista-aportes',
  imports: [CurrencyPipe, DatePipe, RouterLink, MatButton, MatProgressBar],
  templateUrl: './lista-aportes.html',
  styleUrl: './lista-aportes.scss',
})
export class ListaAportes {
  /** La lectura que se muestra (de `AportesApi`). */
  readonly aportes = input.required<LecturaDeAportes>();
  /** Página actual, desde 1. Al cambiarla, la lectura pide la página nueva. */
  readonly pagina = model.required<number>();
  /** Qué encabeza cada aporte: quién aportó o a qué campaña. */
  readonly encabezado = input<'aportante' | 'campana'>('aportante');
  /** Texto cuando no hay ningún aporte. */
  readonly sinAportes = input('Todavía no hay aportes.');

  protected readonly rutaDeCampana = rutaDeCampana;
  protected readonly error = computed(() => {
    const error = this.aportes().error();
    return error === undefined ? undefined : leerErrorDeApi(error);
  });
}
