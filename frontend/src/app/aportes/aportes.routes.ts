import { Routes } from '@angular/router';
import { guardSesion } from '../core/sesion/guards';

/**
 * Enlace a la página de una campaña.
 *
 * Provisorio: hoy lleva a la página de aportes de la campaña. Cuando exista el
 * detalle de la campaña (`/campanas/:id`, docs/frontend.md §2), se cambia aquí
 * y todos los enlaces del dominio lo siguen.
 */
export function rutaDeCampana(idCampana: string): string[] {
  return ['/aportes/campana', idCampana];
}

/** Enlace a los aportes recibidos de una campaña, en el panel del organizador. */
export function rutaDeAportesRecibidos(idCampana: string): string[] {
  return ['/panel/campanas', idCampana, 'aportes'];
}

/** Pantallas de contribution-service (docs/frontend.md §2). */
export const rutasAportes: Routes = [
  {
    path: 'aportes/mios',
    title: 'Mis aportes',
    canActivate: [guardSesion],
    loadComponent: () => import('./mis-aportes/mis-aportes').then((m) => m.MisAportes),
  },
  {
    // Provisoria: aloja "Aportar" y el historial hasta que exista el detalle de la campaña.
    path: 'aportes/campana/:idCampana',
    title: 'Aportes de la campaña',
    loadComponent: () =>
      import('./aportes-de-campana/aportes-de-campana').then((m) => m.AportesDeCampana),
  },
  {
    path: 'panel/campanas/:idCampana/aportes',
    title: 'Aportes recibidos',
    canActivate: [guardSesion],
    loadComponent: () =>
      import('./aportes-recibidos/aportes-recibidos').then((m) => m.AportesRecibidos),
  },
];
