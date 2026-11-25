import { Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

export interface EnlaceDePanel {
  readonly ruta: string;
  readonly icono: string;
  readonly titulo: string;
  readonly descripcion: string;
}

/** Las opciones de un panel, como tarjetas con enlace. */
@Component({
  selector: 'app-enlaces-de-panel',
  imports: [MatIcon, RouterLink],
  template: `
    <ul>
      @for (enlace of enlaces(); track enlace.ruta) {
        <li>
          <a [routerLink]="enlace.ruta">
            <mat-icon aria-hidden="true">{{ enlace.icono }}</mat-icon>
            <span class="titulo">{{ enlace.titulo }}</span>
            <span class="descripcion">{{ enlace.descripcion }}</span>
          </a>
        </li>
      }
    </ul>
  `,
  styles: `
    ul {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr));
      gap: 16px;
      margin: 24px 0 0;
      padding: 0;
      list-style: none;
    }

    a {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 4px 12px;
      height: 100%;
      box-sizing: border-box;
      padding: 16px;
      border: 1px solid var(--color-borde);
      border-radius: var(--mat-sys-corner-medium);
      color: var(--color-marca);
      text-decoration: none;
    }

    a:hover,
    a:focus-visible {
      border-color: var(--color-marca);
      background-color: var(--color-fondo-suave);
    }

    .titulo {
      font: var(--mat-sys-title-medium);
      font-weight: 700;
      text-decoration: underline;
    }

    .descripcion {
      grid-column: 2;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class EnlacesDePanel {
  readonly enlaces = input.required<readonly EnlaceDePanel[]>();
}
