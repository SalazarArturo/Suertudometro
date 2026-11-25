import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { leerErrorDeApi } from '../../core/http/error-de-api';
import { AvisosSinLeer } from '../avisos-sin-leer';
import { NotificacionesApi } from '../notificaciones-api';
import { Aviso, iconoDelAviso } from '../notificaciones.model';
import { rutaDelAviso } from '../notificaciones.routes';

/** La bandeja de avisos (`/avisos`, docs/servicios/notification-service.md §11). */
@Component({
  selector: 'app-bandeja',
  imports: [DatePipe, RouterLink, MatButton, MatCheckbox, MatIcon, MatProgressBar],
  templateUrl: './bandeja.html',
  styleUrl: './bandeja.scss',
})
export class Bandeja {
  private readonly api = inject(NotificacionesApi);
  private readonly sinLeer = inject(AvisosSinLeer);
  private readonly mensajes = inject(MatSnackBar);

  protected readonly icono = iconoDelAviso;
  protected readonly ruta = rutaDelAviso;

  protected readonly pagina = signal(1);
  protected readonly soloNoLeidos = signal(false);
  protected readonly avisos = this.api.avisos(this.pagina, this.soloNoLeidos);
  protected readonly procesando = signal(false);

  protected readonly error = computed(() => {
    const error = this.avisos.error();
    return error === undefined ? undefined : leerErrorDeApi(error).detalle;
  });
  /** Se ofrece salvo que se sepa que no hay ninguno sin leer. */
  protected readonly puedeMarcarTodos = computed(
    () => this.sinLeer.cantidad() !== 0 && !this.procesando(),
  );

  constructor() {
    // Si llegan avisos nuevos con la bandeja abierta, aparecen solos.
    let anterior: number | undefined;
    effect(() => {
      const cantidad = this.sinLeer.cantidad();
      if (anterior !== undefined && cantidad !== undefined && cantidad > anterior) {
        untracked(() => this.avisos.reload());
      }
      anterior = cantidad ?? anterior;
    });
  }

  protected filtrar(soloNoLeidos: boolean): void {
    this.soloNoLeidos.set(soloNoLeidos);
    this.pagina.set(1);
  }

  /** Al abrir un aviso también se marca. Si la marca falla, se abre igual y sigue sin leer. */
  protected async alAbrir(aviso: Aviso): Promise<void> {
    if (!aviso.leido) {
      await this.enviar(this.api.marcarLeido(aviso.id)).catch(() => undefined);
    }
  }

  protected marcarLeido(aviso: Aviso): Promise<void> {
    return this.marcar(this.api.marcarLeido(aviso.id));
  }

  protected marcarTodos(): Promise<void> {
    return this.marcar(this.api.marcarTodosLeidos());
  }

  private async marcar(peticion: Observable<void>): Promise<void> {
    this.procesando.set(true);
    try {
      await this.enviar(peticion);
    } catch (error) {
      this.mensajes.open(leerErrorDeApi(error).detalle, 'Cerrar', { duration: 5000 });
    } finally {
      this.procesando.set(false);
    }
  }

  private async enviar(peticion: Observable<void>): Promise<void> {
    await firstValueFrom(peticion);
    this.sinLeer.actualizar();
    if (this.soloNoLeidos() && this.pagina() > 1) {
      // El leído sale de la lista y la última página podría quedar vacía.
      this.pagina.set(1);
    } else {
      this.avisos.reload();
    }
  }
}
