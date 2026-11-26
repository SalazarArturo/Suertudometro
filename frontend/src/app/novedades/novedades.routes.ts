import { Routes } from '@angular/router';
import { guardSesion } from '../core/sesion/guards';

export const rutasNovedades: Routes = [
  {
    path: '',
    pathMatch: 'full',
    canActivate: [guardSesion],
    title: 'Publicar novedades',
    loadComponent: () => import('./publicar-novedad').then((m) => m.PublicarNovedad),
  },
];
