import { Component, computed, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Campanita } from '../../../notificaciones/campanita/campanita';
import { Sesion } from '../../sesion/sesion';
import { NOMBRE_APLICACION } from '../../titulo/estrategia-titulo';
import { ENLACES_PRINCIPALES } from '../enlaces-principales';

/**
 * Barra superior del shell, con el estilo del afiche: los enlaces principales a la
 * izquierda, la marca al centro y, según la sesión, el acceso o la campanita y el
 * menú de la cuenta a la derecha.
 */
@Component({
  selector: 'app-barra-superior',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatButton,
    MatIcon,
    MatMenu,
    MatMenuItem,
    MatMenuTrigger,
    Campanita,
  ],
  templateUrl: './barra-superior.html',
  styleUrl: './barra-superior.scss',
})
export class BarraSuperior {
  protected readonly sesion = inject(Sesion);
  protected readonly nombreAplicacion = NOMBRE_APLICACION;
  private readonly router = inject(Router);
  private readonly avisos = inject(MatSnackBar);

  protected readonly enlaces = ENLACES_PRINCIPALES;
  /** Los filtros del catálogo van en la URL y no cambian de pantalla. */
  protected readonly mismaRuta: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };
  /** La primera letra del nombre, para el círculo de la cuenta. */
  protected readonly inicial = computed(() => {
    const nombre = this.sesion.usuario()?.nombre.trim() ?? '';
    return (Array.from(nombre)[0] ?? '').toLocaleUpperCase('es');
  });

  protected cerrarSesion(): void {
    this.sesion.cerrar();
    this.avisos.open('Cerraste tu sesión.', undefined, { duration: 3000 });
    void this.router.navigateByUrl('/');
  }
}
