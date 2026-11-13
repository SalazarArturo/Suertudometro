import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { Sesion } from './sesion';
import { Rol } from './sesion.model';

// Los guards solo ordenan la navegación: la seguridad la ponen el gateway y
// cada servicio, que responden 401 o 403 aunque alguien se salte un guard.

/** Exige sesión; sin ella, manda a iniciar sesión y vuelve después. */
export const guardSesion: CanActivateFn = (_ruta, estado) =>
  inject(Sesion).autenticado() || irAIngresar(estado.url);

/** Exige sesión y el rol indicado; con otro rol, manda al inicio. */
export function guardRol(rol: Rol): CanActivateFn {
  return (_ruta, estado) => {
    const sesion = inject(Sesion);
    if (!sesion.autenticado()) {
      return irAIngresar(estado.url);
    }
    return sesion.usuario()?.rol === rol || inject(Router).createUrlTree(['/']);
  };
}

/** Saca de `/ingresar` y `/registro` a quien ya tiene sesión. */
export const guardInvitado: CanActivateFn = () =>
  !inject(Sesion).autenticado() || inject(Router).createUrlTree(['/']);

function irAIngresar(volverA: string): UrlTree {
  return inject(Router).createUrlTree(['/ingresar'], { queryParams: { volverA } });
}
