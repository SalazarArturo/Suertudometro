import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressBar } from '@angular/material/progress-bar';
import { RouterLink } from '@angular/router';
import { Aportar } from '../../aportes/aportar/aportar';
import { rutaDeAportesRecibidos } from '../../aportes/aportes.routes';
import { HistorialAportes } from '../../aportes/historial-aportes/historial-aportes';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { Sesion } from '../../core/sesion/sesion';
import { CampanasApi } from '../campanas-api';
import {
  calcularPorcentajeAvance,
  ETIQUETA_CATEGORIA,
  ETIQUETA_ESTADO_CAMPANA,
  ETIQUETA_MOTIVO_CIERRE,
  ImagenCampana,
} from '../campanas.model';
import { rutaEditarCampana } from '../campanas.routes';

/**
 * Detalle público de una campaña (`/campanas/:id`, docs/servicios/campaign-service.md §11).
 *
 * Muestra portada, galería, historia, meta, progreso, fecha límite, estado,
 * historial de estados (para el organizador o administrador) e integra las
 * secciones `<app-aportar>` y `<app-historial-aportes>` de `contribution-service`.
 */
@Component({
  selector: 'app-detalle-campana',
  imports: [
    CurrencyPipe,
    DatePipe,
    RouterLink,
    MatButton,
    MatProgressBar,
    Aportar,
    HistorialAportes,
  ],
  templateUrl: './detalle-campana.html',
  styleUrl: './detalle-campana.scss',
})
export class DetalleCampana {
  /** `:id` de la campaña desde la ruta. */
  readonly id = input.required<string>();

  private readonly api = inject(CampanasApi);
  protected readonly sesion = inject(Sesion);

  protected readonly etiquetasCategoria = ETIQUETA_CATEGORIA;
  protected readonly etiquetasEstado = ETIQUETA_ESTADO_CAMPANA;
  protected readonly etiquetasMotivoCierre = ETIQUETA_MOTIVO_CIERRE;
  protected readonly rutaEditarCampana = rutaEditarCampana;
  protected readonly rutaDeAportesRecibidos = rutaDeAportesRecibidos;

  protected readonly campana = this.api.detalleDeCampana(this.id);

  protected readonly esOrganizadorDueno = computed(() => {
    const actual = this.campana.value();
    const usuario = this.sesion.usuario();
    return actual !== undefined && usuario !== undefined && actual.idOrganizador === usuario.id;
  });

  protected readonly puedeVerHistorialEstados = computed(
    () => this.esOrganizadorDueno() || this.sesion.esAdministrador(),
  );

  protected readonly historialEstados = this.api.historialDeEstados(
    this.id,
    this.puedeVerHistorialEstados,
  );

  protected readonly imagenPortada = computed<ImagenCampana | undefined>(() => {
    const imagenes = this.campana.value()?.imagenes ?? [];
    return imagenes.find((img) => img.esPortada) ?? imagenes[0];
  });

  protected readonly porcentajeAvance = computed(() => {
    const datos = this.campana.value();
    return datos ? calcularPorcentajeAvance(datos.montoRecaudado, datos.metaFinanciera) : 0;
  });

  protected readonly errorLectura = computed(() => {
    const err = this.campana.error();
    return err ? leerErrorDeApi(err).detalle : undefined;
  });

  protected alRegistrarAporte(historial: HistorialAportes): void {
    historial.recargar();
    this.campana.reload();
  }
}
