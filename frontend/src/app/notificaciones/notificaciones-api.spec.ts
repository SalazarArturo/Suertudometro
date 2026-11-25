import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { URL_AVISOS, URL_SIN_LEER, urlBandeja } from '../../testing/avisos-de-prueba';
import { URL_API_PRUEBA } from '../../testing/datos-de-prueba';
import { URL_API } from '../core/api/url-api';
import { EN_SEGUNDO_PLANO } from '../core/http/en-segundo-plano';
import { NotificacionesApi } from './notificaciones-api';

describe('NotificacionesApi', () => {
  let api: NotificacionesApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    api = TestBed.inject(NotificacionesApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  function leer<T>(crear: () => T): T {
    const lectura = TestBed.runInInjectionContext(crear);
    TestBed.tick();
    return lectura;
  }

  it('pide la bandeja con su página, su tamaño y el filtro', () => {
    leer(() =>
      api.avisos(
        () => 2,
        () => true,
      ),
    );

    const { request } = backend.expectOne(urlBandeja(2, true));
    expect(request.method).toBe('GET');
    // La bandeja sí la pidió la persona: si la sesión venció, va a iniciarla.
    expect(request.context.get(EN_SEGUNDO_PLANO)).toBe(false);
  });

  it('sin token no pregunta cuántos hay sin leer, y con otro token pregunta de nuevo', () => {
    const token = signal<string | undefined>(undefined);
    leer(() => api.cantidadSinLeer(token));
    backend.expectNone(URL_SIN_LEER);

    token.set('uno');
    TestBed.tick();
    const primera = backend.expectOne(URL_SIN_LEER);
    expect(primera.request.context.get(EN_SEGUNDO_PLANO)).toBe(true);
    primera.flush({ cantidad: 1 });

    token.set('dos');
    TestBed.tick();
    backend.expectOne(URL_SIN_LEER).flush({ cantidad: 2 });
  });

  it('marca uno y marca todos con POST', () => {
    api.marcarLeido('abc').subscribe();
    api.marcarTodosLeidos().subscribe();

    for (const url of [`${URL_AVISOS}/abc/lectura`, `${URL_AVISOS}/lectura`]) {
      const enviada = backend.expectOne(url);
      expect(enviada.request.method).toBe('POST');
      enviada.flush(null, { status: 204, statusText: 'No Content' });
    }
  });
});
