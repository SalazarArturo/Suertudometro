import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { Sesion } from '../core/sesion/sesion';

/**
 * Portada provisoria. La reemplaza "Explorar campañas" (Gabo, search-service),
 * según docs/frontend.md §2.
 */
@Component({
  selector: 'app-inicio',
  imports: [RouterLink, MatButton],
  templateUrl: './inicio.html',
  styleUrl: './inicio.scss',
})
export class Inicio {
  protected readonly sesion = inject(Sesion);
}
