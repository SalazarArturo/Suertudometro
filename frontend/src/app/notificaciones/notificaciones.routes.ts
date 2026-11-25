import { Routes } from '@angular/router';
import { rutaDeAportesRecibidos } from '../aportes/aportes.routes';
import { rutaDetalleCampana, rutaEditarCampana } from '../campanas/campanas.routes';
import { guardSesion } from '../core/sesion/guards';
import { Aviso } from './notificaciones.model';

/** La pantalla donde se ve lo que cuenta el aviso: la misma a la que lleva su correo. */
export function rutaDelAviso(aviso: Pick<Aviso, 'tipo' | 'idCampana'>): string[] {
  switch (aviso.tipo) {
    case 'CAMPANA_RECHAZADA':
      return rutaEditarCampana(aviso.idCampana);
    case 'APORTE_RECIBIDO':
      return rutaDeAportesRecibidos(aviso.idCampana);
    default:
      return rutaDetalleCampana(aviso.idCampana);
  }
}

/** Pantallas de notification-service (docs/frontend.md §2). */
export const rutasNotificaciones: Routes = [
  {
    path: 'avisos',
    title: 'Avisos',
    canActivate: [guardSesion],
    loadComponent: () => import('./bandeja/bandeja').then((m) => m.Bandeja),
  },
];
