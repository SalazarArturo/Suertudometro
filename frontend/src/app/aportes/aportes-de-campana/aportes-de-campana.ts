import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Sesion } from '../../core/sesion/sesion';
import { Aportar } from '../aportar/aportar';
import { rutaDeAportesRecibidos } from '../aportes.routes';
import { HistorialAportes } from '../historial-aportes/historial-aportes';

/**
 * Página provisoria con las dos secciones de aportes de una campaña: aportar y
 * el historial. Existe para poder usarlas mientras no esté el detalle de la
 * campaña (`/campanas/:id`, de campaign-service); cuando exista, esa pantalla
 * monta `<app-aportar>` y `<app-historial-aportes>` y esta página se quita.
 */
@Component({
  selector: 'app-aportes-de-campana',
  imports: [RouterLink, Aportar, HistorialAportes],
  template: `
    <section class="pagina">
      <h1>Aportes de la campaña</h1>
      <div class="secciones">
        <app-aportar [idCampana]="idCampana()" (aportado)="historial.recargar()" />
        <app-historial-aportes #historial [idCampana]="idCampana()" />
      </div>
      @if (sesion.autenticado()) {
        <p class="organizador">
          ¿Organizas esta campaña?
          <a [routerLink]="rutaDeAportesRecibidos(idCampana())">Ver los aportes recibidos</a>
        </p>
      }
    </section>
  `,
  styles: `
    .secciones {
      display: grid;
      gap: 24px;
      align-items: start;

      @media (min-width: 840px) {
        grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
      }
    }

    .organizador {
      margin: 24px 0 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class AportesDeCampana {
  /** `:idCampana` de la ruta. */
  readonly idCampana = input.required<string>();

  protected readonly sesion = inject(Sesion);
  protected readonly rutaDeAportesRecibidos = rutaDeAportesRecibidos;
}
