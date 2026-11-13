import { Component } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';

/** Página para cualquier ruta que no existe. */
@Component({
  selector: 'app-pagina-no-encontrada',
  imports: [RouterLink, MatButton],
  template: `
    <section class="pagina">
      <h1>No encontramos esa página</h1>
      <p>Puede que el enlace esté mal escrito o que la página ya no exista.</p>
      <a matButton="filled" routerLink="/">Ir al inicio</a>
    </section>
  `,
})
export class PaginaNoEncontrada {}
