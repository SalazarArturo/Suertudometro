import { Component } from '@angular/core';

/**
 * Inicio provisorio del panel de administración (`/administracion`, rol
 * `ADMINISTRADOR`). La revisión de campañas la agrega Arturo (campaign-service),
 * según docs/frontend.md §2.
 */
@Component({
  selector: 'app-panel-administracion',
  template: `
    <section class="pagina">
      <h1>Administración</h1>
      <p>Aquí vas a revisar las campañas: aprobarlas, rechazarlas o cancelarlas.</p>
    </section>
  `,
})
export class PanelAdministracion {}
