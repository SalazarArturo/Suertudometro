import { computed, inject, Service } from '@angular/core';
import { Sesion } from '../core/sesion/sesion';
import { NotificacionesApi } from './notificaciones-api';

/** Cuántos avisos sin leer tiene quien tiene la sesión. Lo comparten la campanita y la bandeja. */
@Service()
export class AvisosSinLeer {
  private readonly sesion = inject(Sesion);
  private readonly lectura = inject(NotificacionesApi).cantidadSinLeer(this.sesion.token);

  /** `undefined` mientras no se sabe: sin sesión, cargando o con el servicio caído. */
  readonly cantidad = computed(() =>
    this.lectura.hasValue() ? this.lectura.value().cantidad : undefined,
  );

  actualizar(): void {
    this.lectura.reload();
  }
}
