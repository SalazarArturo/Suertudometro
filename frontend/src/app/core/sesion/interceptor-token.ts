import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { URL_API } from '../api/url-api';
import { Sesion } from './sesion';

/**
 * Agrega `Authorization: Bearer <token>` a las peticiones hacia el api-gateway,
 * y a ninguna otra URL: el token no debe salir hacia otro sitio.
 */
export const interceptorToken: HttpInterceptorFn = (peticion, siguiente) => {
  const token = inject(Sesion).token();
  const urlApi = inject(URL_API);
  if (token === undefined || !esDelApi(peticion.url, urlApi)) {
    return siguiente(peticion);
  }
  return siguiente(peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

function esDelApi(url: string, urlApi: string): boolean {
  return url === urlApi || url.startsWith(`${urlApi}/`);
}
