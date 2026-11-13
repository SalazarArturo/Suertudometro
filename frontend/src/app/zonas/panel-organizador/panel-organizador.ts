import { Component } from '@angular/core';

/**
 * Inicio provisorio del panel del organizador (`/panel`, con sesión).
 * Sus pantallas las agregan Arturo (campañas), Raul (aportes recibidos) y
 * Gabo (novedades), según docs/frontend.md §2.
 */
@Component({
  selector: 'app-panel-organizador',
  template: `
    <section class="pagina">
      <h1>Mi panel</h1>
      <p>Aquí vas a encontrar tus campañas, los aportes que reciben y sus novedades.</p>
    </section>
  `,
})
export class PanelOrganizador {}
