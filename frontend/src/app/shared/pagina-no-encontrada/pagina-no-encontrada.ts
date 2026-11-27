import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

/** Página para cualquier ruta que no existe. */
@Component({
  selector: 'app-pagina-no-encontrada',
  imports: [RouterLink, MatButton],
  template: `
    <section class="pagina">
      <p class="titular-afiche cartel" aria-hidden="true">404</p>
      <p class="mano">uy, por aquí no era</p>
      <h1>No encontramos esa página</h1>
      <p>Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <a matButton="filled" routerLink="/">Ir al inicio</a>
    </section>
  `,
  styles: `
    section {
      display: grid;
      justify-items: start;
      gap: 12px;
    }

    .cartel {
      color: var(--color-accion);
      font-size: clamp(8rem, 28vw, 18rem);
    }

    .mano {
      margin: 0;
      color: var(--color-accion);
      font-size: 2rem;
    }

    h1 {
      margin: 0;
      font-size: clamp(2.2rem, 5vw, 3.6rem);
    }

    p {
      margin: 0;
    }
  `,
})
export class PaginaNoEncontrada {}
