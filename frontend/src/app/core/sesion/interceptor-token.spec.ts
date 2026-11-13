import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { sesionDePrueba, URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../api/url-api';
import { interceptorToken } from './interceptor-token';
import { Sesion } from './sesion';

describe('interceptorToken', () => {
  let http: HttpClient;
  let backend: HttpTestingController;
  let sesion: Sesion;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([interceptorToken])),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    http = TestBed.inject(HttpClient);
    backend = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(Sesion);
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  it('agrega el token de la sesión a las peticiones al API', () => {
    sesion.iniciar(sesionDePrueba());

    http.get(`${URL_API_PRUEBA}/identidad/perfil`).subscribe();

    const peticion = backend.expectOne(`${URL_API_PRUEBA}/identidad/perfil`);
    expect(peticion.request.headers.get('Authorization')).toBe('Bearer token.de.prueba');
    peticion.flush({});
  });

  it('no agrega nada sin sesión', () => {
    http.post(`${URL_API_PRUEBA}/identidad/sesiones`, {}).subscribe();

    const peticion = backend.expectOne(`${URL_API_PRUEBA}/identidad/sesiones`);
    expect(peticion.request.headers.has('Authorization')).toBe(false);
    peticion.flush({});
  });

  it.each([['https://otro.sitio/api/perfil'], [`${URL_API_PRUEBA}-falsa/perfil`]])(
    'no manda el token a %s',
    (url) => {
      sesion.iniciar(sesionDePrueba());

      http.get(url).subscribe();

      const peticion = backend.expectOne(url);
      expect(peticion.request.headers.has('Authorization')).toBe(false);
      peticion.flush({});
    },
  );
});
