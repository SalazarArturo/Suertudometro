import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AportesApi } from '../aportes-api';
import { rutaDeCampana } from '../aportes.routes';
import { ListaAportes } from '../lista-aportes/lista-aportes';

/**
 * "Aportes recibidos" de una campaña (`GET /api/aportes/recibidos?idCampana=`,
 * con sesión), en el panel del organizador.
 *
 * Quién puede verlos lo decide contribution-service: si no es el organizador
 * de la campaña ni un administrador, responde `403` y aquí se muestra su mensaje.
 */
@Component({
  selector: 'app-aportes-recibidos',
  imports: [RouterLink, ListaAportes],
  template: `
    <section class="pagina">
      <h1>Aportes recibidos</h1>
      <p class="bajada">
        @if (resumen(); as resumen) {
          {{ resumen.titulo }} · {{ resumen.total }}
          {{ resumen.total === 1 ? 'aporte' : 'aportes' }}.
        }
        Los aportes anónimos se muestran sin nombre.
        <a [routerLink]="rutaDeCampana(idCampana())">Ver la campaña</a>
      </p>
      <app-lista-aportes
        [aportes]="aportes"
        [(pagina)]="pagina"
        sinAportes="Esta campaña todavía no recibió aportes."
      />
    </section>
  `,
  styles: `
    .bajada {
      margin: 0 0 20px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class AportesRecibidos {
  /** `:idCampana` de la ruta. */
  readonly idCampana = input.required<string>();

  protected readonly rutaDeCampana = rutaDeCampana;
  protected readonly pagina = signal(1);
  protected readonly aportes = inject(AportesApi).aportesRecibidos(this.idCampana, this.pagina);

  /** El título de la campaña y cuántos aportes tiene, cuando ya se sabe. */
  protected readonly resumen = computed(() => {
    const resultado = this.aportes.hasValue() ? this.aportes.value() : undefined;
    const titulo = resultado?.elementos[0]?.tituloCampana;
    return resultado && titulo ? { titulo, total: resultado.totalElementos } : undefined;
  });
}
