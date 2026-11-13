import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BarraSuperior } from './core/layout/barra-superior/barra-superior';

/** Shell de la aplicación: la barra superior y la pantalla de la ruta actual. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, BarraSuperior],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {}
