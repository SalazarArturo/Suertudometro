import { HttpErrorResponse, HttpInterceptorFn, HttpStatusCode } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Sesion } from './sesion';

/** Valor de `motivo` en `/ingresar` cuando la sesión venció. */
export const MOTIVO_SESION_VENCIDA = 'sesion-vencida';

/**
 * Si el API responde `401` a una petición que llevaba token, la sesión ya no
 * sirve (venció o el secreto cambió): la cierra y manda a iniciar sesión.
 *
 * Un `401` sin token (una contraseña incorrecta al iniciar sesión) no es una
 * sesión vencida: lo maneja la pantalla. Por eso va después de `interceptorToken`.
 */
export const interceptorSesionVencida: HttpInterceptorFn = (peticion, siguiente) => {
  const sesion = inject(Sesion);
  const router = inject(Router);
  return siguiente(peticion).pipe(
    catchError((error: unknown) => {
      if (
        error instanceof HttpErrorResponse &&
        error.status === HttpStatusCode.Unauthorized &&
        peticion.headers.has('Authorization')
      ) {
        sesion.cerrar();
        void router.navigate(['/ingresar'], {
          queryParams: { volverA: router.url, motivo: MOTIVO_SESION_VENCIDA },
        });
      }
      return throwError(() => error);
    }),
  );
};
