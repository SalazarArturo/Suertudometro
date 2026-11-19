import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { CampanasApi } from '../campanas-api';
import {
  EstadoCampana,
  ETIQUETA_CATEGORIA,
  ETIQUETA_ESTADO_CAMPANA,
  LARGO_MINIMO_OBSERVACION,
} from '../campanas.model';
import { rutaDetalleCampana } from '../campanas.routes';

/**
 * Panel de administración: bandeja de moderación de campañas
 * (`/administracion/campanas`, docs/servicios/campaign-service.md §11).
 */
@Component({
  selector: 'app-moderacion-campanas',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButton,
    MatFormField,
    MatLabel,
    MatHint,
    MatInput,
  ],
  templateUrl: './moderacion-campanas.html',
  styleUrl: './moderacion-campanas.scss',
})
export class ModeracionCampanas {
  private readonly api = inject(CampanasApi);
  private readonly avisos = inject(MatSnackBar);

  protected readonly etiquetasCategoria = ETIQUETA_CATEGORIA;
  protected readonly etiquetasEstado = ETIQUETA_ESTADO_CAMPANA;
  protected readonly largoMinimoObservacion = LARGO_MINIMO_OBSERVACION;
  protected readonly rutaDetalleCampana = rutaDetalleCampana;

  protected readonly estadoFiltro = signal<EstadoCampana>('EN_REVISION');
  protected readonly pagina = signal(0);
  protected readonly campanas = this.api.campanasPorEstado(this.estadoFiltro, this.pagina);

  protected readonly idRechazando = signal<string | undefined>(undefined);
  protected readonly textoObservaciones = signal('');
  protected readonly idCancelando = signal<string | undefined>(undefined);
  protected readonly motivoCancelacion = signal('');
  protected readonly procesando = signal(false);
  protected readonly errorAccion = signal<string | undefined>(undefined);

  protected readonly errorLectura = computed(() => {
    const err = this.campanas.error();
    return err ? leerErrorDeApi(err).detalle : undefined;
  });

  protected cambiarFiltro(nuevoEstado: EstadoCampana): void {
    this.estadoFiltro.set(nuevoEstado);
    this.pagina.set(0);
    this.cerrarFormularios();
  }

  protected abrirRechazo(idCampana: string): void {
    this.idRechazando.set(idCampana);
    this.idCancelando.set(undefined);
    this.textoObservaciones.set('');
    this.errorAccion.set(undefined);
  }

  protected abrirCancelacion(idCampana: string): void {
    this.idCancelando.set(idCampana);
    this.idRechazando.set(undefined);
    this.motivoCancelacion.set('');
    this.errorAccion.set(undefined);
  }

  protected cerrarFormularios(): void {
    this.idRechazando.set(undefined);
    this.idCancelando.set(undefined);
    this.textoObservaciones.set('');
    this.motivoCancelacion.set('');
    this.errorAccion.set(undefined);
  }

  protected async aprobar(idCampana: string): Promise<void> {
    this.procesando.set(true);
    this.errorAccion.set(undefined);
    try {
      await firstValueFrom(this.api.aprobarCampana(idCampana));
      this.avisos.open('Campaña aprobada y publicada.', 'Cerrar', { duration: 4000 });
      this.campanas.reload();
    } catch (error) {
      this.errorAccion.set(leerErrorDeApi(error).detalle);
    } finally {
      this.procesando.set(false);
    }
  }

  protected async confirmarRechazo(idCampana: string): Promise<void> {
    const obs = this.textoObservaciones().trim();
    if (obs.length < LARGO_MINIMO_OBSERVACION) {
      this.errorAccion.set(
        `Las observaciones de rechazo deben tener al menos ${LARGO_MINIMO_OBSERVACION} caracteres.`,
      );
      return;
    }

    this.procesando.set(true);
    this.errorAccion.set(undefined);
    try {
      await firstValueFrom(this.api.rechazarCampana(idCampana, obs));
      this.cerrarFormularios();
      this.avisos.open('Campaña observada y devuelta a borrador.', 'Cerrar', { duration: 4000 });
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
      this.errorAccion.set('Escribe el motivo de cancelación administrativa.');
      return;
    }

    this.procesando.set(true);
    this.errorAccion.set(undefined);
    try {
      await firstValueFrom(this.api.cancelarCampana(idCampana, motivo));
      this.cerrarFormularios();
      this.avisos.open('Campaña cancelada por administración.', 'Cerrar', { duration: 4000 });
      this.campanas.reload();
    } catch (error) {
      this.errorAccion.set(leerErrorDeApi(error).detalle);
    } finally {
      this.procesando.set(false);
    }
  }
}
