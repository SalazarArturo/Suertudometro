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
      grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr));
      gap: 28px;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    /* Cada opción, como una hoja de papel con sombra plana que se levanta. */
    a {
      display: grid;
      grid-template-columns: max-content 1fr;
      align-items: center;
      gap: 6px 16px;
      height: 100%;
      box-sizing: border-box;
      padding: 22px 24px;
      border: 2px solid var(--color-marca);
      background: var(--color-papel-claro);
      box-shadow: 6px 6px 0 var(--color-marca);
      color: var(--color-marca);
      text-decoration: none;
      transition:
        translate 0.18s ease-out,
        box-shadow 0.18s ease-out;
    }

    a:hover {
      translate: -2px -2px;
      box-shadow: 8px 8px 0 var(--color-accion);
    }

    a:focus-visible {
      outline: 3px solid var(--color-accion);
      outline-offset: 4px;
    }

    mat-icon {
      grid-row: span 2;
      align-self: start;
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: var(--color-accion);
      color: var(--color-papel-claro);
      font-size: 26px;
    }

    .titulo {
      font-family: var(--fuente-titular);
      font-size: 1.6rem;
      line-height: 1;
      text-transform: uppercase;
    }

    .descripcion {
      grid-column: 2;
      color: var(--color-marca-tenue);
    }

    @media (prefers-reduced-motion: reduce) {
      a {
        transition: none;
      }

      a:hover {
        translate: none;
      }
    }
  `,
})
export class EnlacesDePanel {
  readonly enlaces = input.required<readonly EnlaceDePanel[]>();
}
