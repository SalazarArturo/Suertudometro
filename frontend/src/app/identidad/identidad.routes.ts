import { Routes } from '@angular/router';
import { guardInvitado, guardSesion } from '../core/sesion/guards';

/** Pantallas de identity-service (docs/frontend.md §2). */
export const rutasIdentidad: Routes = [
  {
    path: 'ingresar',
    title: 'Iniciar sesión',
    canActivate: [guardInvitado],
    loadComponent: () => import('./iniciar-sesion/iniciar-sesion').then((m) => m.IniciarSesion),
  },
  {
    path: 'registro',
    title: 'Crear cuenta',
    canActivate: [guardInvitado],
    loadComponent: () => import('./registro/registro').then((m) => m.Registro),
  },
  {
    path: 'perfil',
    title: 'Mi perfil',
    canActivate: [guardSesion],
    loadComponent: () => import('./perfil/perfil').then((m) => m.Perfil),
  },
];
