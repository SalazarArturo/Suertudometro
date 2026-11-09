import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbar } from '@angular/material/toolbar';
import { Router, RouterLink } from '@angular/router';
import { Sesion } from '../../sesion/sesion';

/** Barra superior del shell: la marca y, según la sesión, el acceso o el menú de la cuenta. */
@Component({
  selector: 'app-barra-superior',
  imports: [RouterLink, MatToolbar, MatButton, MatIcon, MatMenu, MatMenuItem, MatMenuTrigger],
  templateUrl: './barra-superior.html',
  styleUrl: './barra-superior.scss',
})
export class BarraSuperior {
  protected readonly sesion = inject(Sesion);
  private readonly router = inject(Router);
  private readonly avisos = inject(MatSnackBar);

  protected cerrarSesion(): void {
    this.sesion.cerrar();
    this.avisos.open('Cerraste tu sesión.', undefined, { duration: 3000 });
    void this.router.navigateByUrl('/');
  }
}
