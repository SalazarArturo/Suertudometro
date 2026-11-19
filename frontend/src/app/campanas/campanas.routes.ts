import { Routes } from '@angular/router';
import { guardRol, guardSesion } from '../core/sesion/guards';

/** Enlace público al detalle de una campaña. */
export function rutaDetalleCampana(idCampana: string): string[] {
  return ['/campanas', idCampana];
}

/** Enlace a "Mis campañas" en el panel del organizador. */
export function rutaMisCampanas(): string[] {
  return ['/panel/campanas'];
}

/** Enlace para crear una campaña nueva. */
export function rutaNuevaCampana(): string[] {
  return ['/panel/campanas/nueva'];
}

/** Enlace para editar un borrador existente. */
export function rutaEditarCampana(idCampana: string): string[] {
  return ['/panel/campanas', idCampana, 'editar'];
}

/** Enlace a la bandeja de moderación administrativa. */
export function rutaModeracionCampanas(): string[] {
  return ['/administracion/campanas'];
}

/** Rutas del dominio de campañas (docs/frontend.md §2 y docs/servicios/campaign-service.md §11). */
export const rutasCampanas: Routes = [
  {
    path: 'campanas/:id',
    title: 'Detalle de campaña',
    loadComponent: () => import('./detalle-campana/detalle-campana').then((m) => m.DetalleCampana),
  },
  {
    path: 'panel/campanas',
    title: 'Mis campañas',
    canActivate: [guardSesion],
    loadComponent: () => import('./mis-campanas/mis-campanas').then((m) => m.MisCampanas),
  },
  {
    path: 'panel/campanas/nueva',
    title: 'Crear campaña',
    canActivate: [guardSesion],
    loadComponent: () =>
      import('./formulario-campana/formulario-campana').then((m) => m.FormularioCampana),
  },
  {
    path: 'panel/campanas/:id/editar',
    title: 'Editar campaña',
    canActivate: [guardSesion],
    loadComponent: () =>
      import('./formulario-campana/formulario-campana').then((m) => m.FormularioCampana),
  },
  {
    path: 'administracion/campanas',
    title: 'Moderación de campañas',
    canActivate: [guardRol('ADMINISTRADOR')],
    loadComponent: () =>
      import('./moderacion-campanas/moderacion-campanas').then((m) => m.ModeracionCampanas),
  },
];
