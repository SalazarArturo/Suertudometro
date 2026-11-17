import { Component, inject, signal } from '@angular/core';
import { AportesApi } from '../aportes-api';
import { ListaAportes } from '../lista-aportes/lista-aportes';

/** "Mis aportes" (`GET /api/aportes/mios`, con sesión): los aportes de quien tiene la sesión. */
@Component({
  selector: 'app-mis-aportes',
  imports: [ListaAportes],
  template: `
    <section class="pagina">
      <h1>Mis aportes</h1>
      <p class="bajada">
        Los aportes que hiciste, del más reciente al más antiguo. Los anónimos también aparecen
        aquí, pero solo tú puedes verlos.
      </p>
      <app-lista-aportes
        [aportes]="aportes"
        [(pagina)]="pagina"
        encabezado="campana"
        sinAportes="Todavía no hiciste ningún aporte."
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
export class MisAportes {
  protected readonly pagina = signal(1);
  protected readonly aportes = inject(AportesApi).misAportes(this.pagina);
}
