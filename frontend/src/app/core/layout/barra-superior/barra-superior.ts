import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbar } from '@angular/material/toolbar';
import { IsActiveMatchOptions, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { Campanita } from '../../../notificaciones/campanita/campanita';
import { Sesion } from '../../sesion/sesion';
import { NOMBRE_APLICACION } from '../../titulo/estrategia-titulo';

/**
 * Barra superior del shell: la marca, los enlaces principales (como en el mockup
 * del enunciado) y, según la sesión, el acceso o la campanita y el menú de la
 * cuenta.
 */
@Component({
  selector: 'app-barra-superior',
  imports: [
    RouterLink,
    RouterLinkActive,
    MatToolbar,
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

  /** Se muestran siempre: los que piden sesión llevan a iniciarla y después vuelven. */
  protected readonly enlaces = [
    { ruta: '/', texto: 'Explorar' },
    { ruta: '/panel/campanas/nueva', texto: 'Crear campaña' },
    { ruta: '/aportes/mios', texto: 'Mis aportes' },
  ] as const;
  /** Los filtros del catálogo van en la URL y no cambian de pantalla. */
  protected readonly mismaRuta: IsActiveMatchOptions = {
    paths: 'exact',
    queryParams: 'ignored',
    matrixParams: 'ignored',
    fragment: 'ignored',
  };

  protected cerrarSesion(): void {
    this.sesion.cerrar();
    this.avisos.open('Cerraste tu sesión.', undefined, { duration: 3000 });
    void this.router.navigateByUrl('/');
  }
}
