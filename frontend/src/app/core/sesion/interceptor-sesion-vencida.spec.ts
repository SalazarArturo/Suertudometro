import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import { problemaDePrueba, sesionDePrueba, URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../api/url-api';
import { interceptorSesionVencida, MOTIVO_SESION_VENCIDA } from './interceptor-sesion-vencida';
import { interceptorToken } from './interceptor-token';
import { Sesion } from './sesion';

describe('interceptorSesionVencida', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let sesion: Sesion;
  let navegar: MockInstance<Router['navigate']>;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([interceptorToken, interceptorSesionVencida])),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(Sesion);
    navegar = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  it('ante un 401 a una petición con token, cierra la sesión y manda a iniciar sesión', () => {
    sesion.iniciar(sesionDePrueba());
    let recibido: unknown;

    http
      .get(`${URL_API_PRUEBA}/identidad/perfil`)
      .subscribe({ error: (e: unknown) => (recibido = e) });
    backend
      .expectOne(`${URL_API_PRUEBA}/identidad/perfil`)
      .flush(problemaDePrueba('no-autenticado', 401, 'Token vencido.'), {
        status: 401,
        statusText: 'Unauthorized',
      });

    expect(sesion.autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith(['/ingresar'], {
      queryParams: { volverA: '/', motivo: MOTIVO_SESION_VENCIDA },
    });
    // El error sigue su camino: la pantalla también se entera.
    expect(recibido).toBeInstanceOf(HttpErrorResponse);
  });

  it('un 401 sin token, como credenciales inválidas, lo deja a la pantalla', () => {
    http.post(`${URL_API_PRUEBA}/identidad/sesiones`, {}).subscribe({ error: () => undefined });
    backend
      .expectOne(`${URL_API_PRUEBA}/identidad/sesiones`)
      .flush(problemaDePrueba('credenciales-invalidas', 401, 'No coinciden.'), {
        status: 401,
        statusText: 'Unauthorized',
      });

    expect(navegar).not.toHaveBeenCalled();
  });

  it('otros errores no tocan la sesión', () => {
    sesion.iniciar(sesionDePrueba());

    http.get(`${URL_API_PRUEBA}/identidad/perfil`).subscribe({ error: () => undefined });
    backend
      .expectOne(`${URL_API_PRUEBA}/identidad/perfil`)
      .flush(null, { status: 503, statusText: 'Service Unavailable' });

    expect(sesion.autenticado()).toBe(true);
    expect(navegar).not.toHaveBeenCalled();
  });
});
