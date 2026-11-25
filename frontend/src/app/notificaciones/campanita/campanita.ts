import { Component, computed, DestroyRef, DOCUMENT, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AvisosSinLeer } from '../avisos-sin-leer';

/** Cada cuánto se vuelve a preguntar cuántos avisos hay sin leer. */
export const INTERVALO_MS = 30_000;

/** El mayor número que cabe en el globo: más allá, "99+". */
const MAXIMO_VISIBLE = 99;

/**
 * El acceso a la bandeja en la barra superior, con la cantidad sin leer. Pregunta
 * cada 30 segundos mientras la pestaña está a la vista, y al volver a ella. Si el
 * servicio no responde, se queda sin globo y no molesta.
 */
@Component({
  selector: 'app-campanita',
  imports: [MatIconButton, MatIcon, RouterLink, RouterLinkActive],
  template: `
    <a
      matIconButton
      routerLink="/avisos"
      routerLinkActive
      ariaCurrentWhenActive="page"
      [attr.aria-label]="etiqueta()"
    >
      <mat-icon aria-hidden="true">notifications</mat-icon>
      @if (globo(); as texto) {
        <span class="globo" aria-hidden="true">{{ texto }}</span>
      }
    </a>
  `,
  styleUrl: './campanita.scss',
})
export class Campanita {
  private readonly sinLeer = inject(AvisosSinLeer);

  private readonly cantidad = computed(() => this.sinLeer.cantidad() ?? 0);
  protected readonly globo = computed(() =>
    this.cantidad() > MAXIMO_VISIBLE ? `${MAXIMO_VISIBLE}+` : this.cantidad() || undefined,
  );
  protected readonly etiqueta = computed(() =>
    this.cantidad() > 0 ? `Avisos, ${this.cantidad()} sin leer` : 'Avisos',
  );

  constructor() {
    const documento = inject(DOCUMENT);
    const actualizarSiSeVe = () => {
      if (documento.visibilityState === 'visible') {
        this.sinLeer.actualizar();
      }
    };
    const temporizador = setInterval(actualizarSiSeVe, INTERVALO_MS);
    documento.addEventListener('visibilitychange', actualizarSiSeVe);
    inject(DestroyRef).onDestroy(() => {
      clearInterval(temporizador);
      documento.removeEventListener('visibilitychange', actualizarSiSeVe);
    });
  }
}
