import { Component } from '@angular/core';
import { EnlaceDePanel, EnlacesDePanel } from '../../shared/enlaces-de-panel/enlaces-de-panel';

/**
 * Inicio del panel de administración (`/administracion`, rol `ADMINISTRADOR`):
 * lleva a las pantallas que agregan los dominios (docs/frontend.md §2).
 */
@Component({
  selector: 'app-panel-administracion',
  imports: [EnlacesDePanel],
  template: `
    <section class="pagina">
      <header class="cabecera-pagina">
        <div>
          <p class="mano">solo para administración</p>
          <h1 class="titular-afiche">Administración</h1>
          <p class="bajada">Revisa las campañas antes de que se publiquen.</p>
        </div>
      </header>
      <app-enlaces-de-panel [enlaces]="enlaces" />
    </section>
  `,
})
export class PanelAdministracion {
  protected readonly enlaces: readonly EnlaceDePanel[] = [
    {
      ruta: '/administracion/campanas',
      icono: 'fact_check',
      titulo: 'Moderación de campañas',
      descripcion: 'Aprueba, devuelve con observaciones o cancela campañas.',
    },
  ];
}
