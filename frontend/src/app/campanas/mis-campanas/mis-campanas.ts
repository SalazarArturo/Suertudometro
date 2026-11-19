import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { rutaDeAportesRecibidos } from '../../aportes/aportes.routes';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { CampanasApi } from '../campanas-api';
import {
  calcularPorcentajeAvance,
  ETIQUETA_CATEGORIA,
  ETIQUETA_ESTADO_CAMPANA,
} from '../campanas.model';
import { rutaDetalleCampana, rutaEditarCampana, rutaNuevaCampana } from '../campanas.routes';

/**
 * Panel del organizador: "Mis campañas" (`/panel/campanas`, docs/servicios/campaign-service.md §11).
 */
@Component({
  selector: 'app-mis-campanas',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButton,
    MatFormField,
    MatLabel,
    MatInput,
    MatProgressBar,
  ],
  templateUrl: './mis-campanas.html',
  styleUrl: './mis-campanas.scss',
})
export class MisCampanas {
  private readonly api = inject(CampanasApi);
  private readonly avisos = inject(MatSnackBar);

  protected readonly etiquetasCategoria = ETIQUETA_CATEGORIA;
  protected readonly etiquetasEstado = ETIQUETA_ESTADO_CAMPANA;
  protected readonly calcularPorcentajeAvance = calcularPorcentajeAvance;
  protected readonly rutaDetalleCampana = rutaDetalleCampana;
  protected readonly rutaEditarCampana = rutaEditarCampana;
  protected readonly rutaNuevaCampana = rutaNuevaCampana;
  protected readonly rutaDeAportesRecibidos = rutaDeAportesRecibidos;

  protected readonly pagina = signal(0);
  protected readonly campanas = this.api.misCampanas(this.pagina);
  protected readonly idCampanaCancelando = signal<string | undefined>(undefined);
  protected readonly motivoCancelacion = signal('');
  protected readonly errorAccion = signal<string | undefined>(undefined);
  protected readonly procesando = signal(false);

  protected readonly errorLectura = computed(() => {
    const err = this.campanas.error();
    return err ? leerErrorDeApi(err).detalle : undefined;
  });

  protected abrirCancelacion(idCampana: string): void {
    this.idCampanaCancelando.set(idCampana);
    this.motivoCancelacion.set('');
    this.errorAccion.set(undefined);
  }

  protected cerrarCancelacion(): void {
    this.idCampanaCancelando.set(undefined);
    this.motivoCancelacion.set('');
  }

  protected async eliminarBorrador(idCampana: string): Promise<void> {
    this.procesando.set(true);
    this.errorAccion.set(undefined);
    try {
      await firstValueFrom(this.api.eliminarBorrador(idCampana));
      this.avisos.open('Borrador eliminado.', 'Cerrar', { duration: 4000 });
      this.campanas.reload();
    } catch (error) {
      this.errorAccion.set(leerErrorDeApi(error).detalle);
    } finally {
      this.procesando.set(false);
    }
  }

  protected async confirmarCancelacion(idCampana: string): Promise<void> {
    const motivo = this.motivoCancelacion().trim();
    if (motivo === '') {
      this.errorAccion.set('Escribe el motivo de cancelación.');
      return;
    }

    this.procesando.set(true);
    this.errorAccion.set(undefined);
    try {
      await firstValueFrom(this.api.cancelarCampana(idCampana, motivo));
      this.cerrarCancelacion();
      this.avisos.open('Campaña cancelada.', 'Cerrar', { duration: 4000 });
      this.campanas.reload();
    } catch (error) {
      this.errorAccion.set(leerErrorDeApi(error).detalle);
    } finally {
      this.procesando.set(false);
    }
  }

  protected paginaAnterior(): void {
    this.pagina.update((p) => Math.max(0, p - 1));
  }

  protected paginaSiguiente(totalPaginas: number): void {
    this.pagina.update((p) => (p + 1 < totalPaginas ? p + 1 : p));
  }
}
