import { Component, inject, input, signal } from '@angular/core';
import { AportesApi } from '../aportes-api';
import { ListaAportes } from '../lista-aportes/lista-aportes';

/**
 * Historial público de aportes de una campaña (`GET /api/aportes?idCampana=`):
 * nombre o "Anónimo", monto, mensaje y fecha. No pide sesión.
 *
 * Es una sección del detalle de la campaña: recibe `idCampana`.
 */
@Component({
  selector: 'app-historial-aportes',
  imports: [ListaAportes],
  template: `
    <section aria-labelledby="titulo-historial">
      <h2 id="titulo-historial">Historial de aportes</h2>
      <app-lista-aportes
        [aportes]="aportes"
        [(pagina)]="pagina"
        sinAportes="Esta campaña todavía no tiene aportes."
      />
    </section>
  `,
  styles: `
    h2 {
      margin: 0 0 16px;
      font-size: clamp(1.8rem, 3vw, 2.4rem);
    }
  `,
})
export class HistorialAportes {
  /** La campaña de la que se muestran los aportes. */
  readonly idCampana = input.required<string>();

  protected readonly pagina = signal(1);
  protected readonly aportes = inject(AportesApi).historialDeCampana(this.idCampana, this.pagina);

  /** Vuelve a leer desde la primera página. Se llama después de registrar un aporte. */
  recargar(): void {
    if (this.pagina() === 1) {
      this.aportes.reload();
    } else {
      // Cambiar la página ya dispara la lectura.
      this.pagina.set(1);
    }
  }
}
