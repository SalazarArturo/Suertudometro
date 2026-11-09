import { Routes } from '@angular/router';
import { guardRol, guardSesion } from './core/sesion/guards';

/**
 * Rutas de primer nivel (docs/frontend.md §2). Cada dominio agrega aquí una
 * línea con `loadChildren` hacia su `<dominio>.routes.ts`. El `title` es solo
 * el nombre de la pantalla: `EstrategiaTitulo` le agrega el de la aplicación.
 */
export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./inicio/inicio').then((m) => m.Inicio),
  },
  {
    path: '',
    loadChildren: () => import('./identidad/identidad.routes').then((m) => m.rutasIdentidad),
  },
  {
    path: 'panel',
    title: 'Mi panel',
    canActivate: [guardSesion],
    loadComponent: () =>
      import('./zonas/panel-organizador/panel-organizador').then((m) => m.PanelOrganizador),
  },
  {
    path: 'administracion',
    title: 'Administración',
    canActivate: [guardRol('ADMINISTRADOR')],
    loadComponent: () =>
      import('./zonas/panel-administracion/panel-administracion').then(
        (m) => m.PanelAdministracion,
      ),
  },
  {
    path: '**',
    title: 'Página no encontrada',
    loadComponent: () =>
      import('./shared/pagina-no-encontrada/pagina-no-encontrada').then(
        (m) => m.PaginaNoEncontrada,
      ),
  },
];
