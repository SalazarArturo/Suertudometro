import { Routes } from '@angular/router';

export const rutasBusqueda: Routes = [
  {
    path: '',
    title: 'Explorar campañas',
    loadComponent: () =>
      import('./explorar-campanas/explorar-campanas').then((m) => m.ExplorarCampanas),
  },
];
