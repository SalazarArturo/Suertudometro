import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, linkedSignal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { leerErrorDeApi } from '../core/http/error-de-api';
import { NovedadesApi, TAMANO_PAGINA_NOVEDADES } from './novedades-api';

@Component({
  selector: 'app-historial-novedades',
  imports: [DatePipe, MatButton],
  template: `
    <section aria-labelledby="titulo-novedades">
      <h2 id="titulo-novedades">Novedades de la campaña</h2>
      @if (historial.isLoading()) {
        <p role="status">Cargando novedades…</p>
      } @else if (historial.error()) {
        <p role="alert">{{ errorLectura() }}</p>
        <button matButton type="button" (click)="historial.reload()">Volver a cargar</button>
      } @else if (historial.hasValue()) {
        @if (historial.value().total === 0) {
          <p>Esta campaña todavía no tiene novedades.</p>
        } @else {
          <ul>
            @for (novedad of historial.value().resultados; track novedad.idActualizacion) {
              <li>
                <time [attr.datetime]="novedad.publicadoEn">
                  {{ novedad.publicadoEn | date: 'medium' }}
                </time>
                <p>{{ novedad.contenido }}</p>
              </li>
            }
          </ul>
          @if (totalPaginas() > 1) {
            <nav aria-label="Páginas de novedades">
              <button
                matButton
                type="button"
                [disabled]="pagina() === 0"
                (click)="pagina.set(pagina() - 1)"
              >
                Anterior
              </button>
              <span>Página {{ pagina() + 1 }} de {{ totalPaginas() }}</span>
              <button
                matButton
                type="button"
                [disabled]="pagina() + 1 >= totalPaginas()"
                (click)="pagina.set(pagina() + 1)"
              >
                Siguiente
              </button>
            </nav>
          }
        }
      }
    </section>
  `,
  styles: `
    :host {
      display: block;
      margin-block: 24px;
    }
    ul {
      margin: 0;
      padding: 0;
      list-style: none;
    }
    li {
      border-block-start: 1px solid var(--color-borde);
      padding-block: 12px;
    }
    li p {
      margin: 4px 0 0;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
    time {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class HistorialNovedades {
  readonly idCampana = input.required<string>();
  protected readonly pagina = linkedSignal({ source: this.idCampana, computation: () => 0 });
  protected readonly historial = inject(NovedadesApi).historial(this.idCampana, this.pagina);
  protected readonly totalPaginas = computed(() =>
    Math.ceil((this.historial.value()?.total ?? 0) / TAMANO_PAGINA_NOVEDADES),
  );
  protected readonly errorLectura = computed(() => {
    const error = leerErrorDeApi(this.historial.error());
    return error.estado === 404
      ? 'El historial todavía no está disponible para esta campaña.'
      : error.detalle;
  });
}
