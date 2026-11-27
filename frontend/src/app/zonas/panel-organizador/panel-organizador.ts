import { Component } from '@angular/core';
import { EnlaceDePanel, EnlacesDePanel } from '../../shared/enlaces-de-panel/enlaces-de-panel';

/**
 * Inicio del panel del organizador (`/panel`, con sesión): lleva a las pantallas
 * que agregan los dominios (docs/frontend.md §2).
 */
@Component({
  selector: 'app-panel-organizador',
  imports: [EnlacesDePanel],
  template: `
    <section class="pagina">
      <header class="cabecera-pagina">
        <div>
          <p class="mano">lo tuyo, a mano</p>
          <h1 class="titular-afiche">Mi panel</h1>
          <p class="bajada">Tus campañas, tus aportes y tus avisos, en un solo lugar.</p>
        </div>
      </header>
      <app-enlaces-de-panel [enlaces]="enlaces" />
    </section>
  `,
})
export class PanelOrganizador {
  protected readonly enlaces: readonly EnlaceDePanel[] = [
    {
      ruta: '/panel/campanas',
      icono: 'campaign',
      titulo: 'Mis campañas',
      descripcion: 'Tus borradores, su progreso y los aportes que reciben.',
    },
    {
      ruta: '/panel/campanas/nueva',
      icono: 'add_circle',
      titulo: 'Crear campaña',
      descripcion: 'Cuenta tu historia, pon una meta y pide la revisión.',
    },
    {
      ruta: '/panel/novedades',
      icono: 'edit_note',
      titulo: 'Publicar novedades',
      descripcion: 'Comparte los avances de tus campañas publicadas.',
    },
    {
      ruta: '/aportes/mios',
      icono: 'volunteer_activism',
      titulo: 'Mis aportes',
      descripcion: 'Los aportes que hiciste, también los anónimos.',
    },
    {
      ruta: '/avisos',
      icono: 'notifications',
      titulo: 'Avisos',
      descripcion: 'Lo que pasó en las campañas que organizas o apoyaste.',
    },
  ];
}
