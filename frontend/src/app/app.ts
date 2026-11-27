import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarraSuperior } from './core/layout/barra-superior/barra-superior';
import { PiePagina } from './core/layout/pie-pagina/pie-pagina';

/** Shell de la aplicación: la barra superior, la pantalla de la ruta actual y el pie. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BarraSuperior, PiePagina],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
