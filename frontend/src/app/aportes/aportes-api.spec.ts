import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  ID_CAMPANA_DE_PRUEBA,
  URL_APORTES,
  urlAportesRecibidos,
  urlHistorial,
  urlMisAportes,
} from '../../testing/aportes-de-prueba';
import { URL_API_PRUEBA } from '../../testing/datos-de-prueba';
import { URL_API } from '../core/api/url-api';
import { AportesApi } from './aportes-api';

describe('AportesApi', () => {
  let api: AportesApi;
  let backend: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    api = TestBed.inject(AportesApi);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => backend.verify());

  /** Crea la lectura como lo hace un componente y deja correr su primera petición. */
  function leer<T>(crear: () => T): T {
    const lectura = TestBed.runInInjectionContext(crear);
    TestBed.tick();
    return lectura;
  }

  it('registra un aporte con POST /api/aportes', () => {
    const peticion = {
      idCampana: ID_CAMPANA_DE_PRUEBA,
      monto: '150.00',
      moneda: 'BOB',
      mensajeApoyo: null,
      esAnonimo: true,
    };
    let idAporte: string | undefined;
    api.realizarAporte(peticion).subscribe((creado) => (idAporte = creado.idAporte));

    const enviada = backend.expectOne(URL_APORTES);
    expect(enviada.request.method).toBe('POST');
    expect(enviada.request.body).toEqual(peticion);
    enviada.flush({ idAporte: 'abc' }, { status: 201, statusText: 'Created' });

    expect(idAporte).toBe('abc');
  });

  it('pide el historial de una campaña con su página y su tamaño', () => {
    leer(() =>
      api.historialDeCampana(
        () => ID_CAMPANA_DE_PRUEBA,
        () => 2,
      ),
    );

    expect(backend.expectOne(urlHistorial(2)).request.method).toBe('GET');
  });

  it('pide "Mis aportes" en /api/aportes/mios', () => {
    leer(() => api.misAportes(() => 1));

    backend.expectOne(urlMisAportes());
  });

  it('pide los aportes recibidos de una campaña en /api/aportes/recibidos', () => {
    leer(() =>
      api.aportesRecibidos(
        () => ID_CAMPANA_DE_PRUEBA,
        () => 1,
      ),
    );

    backend.expectOne(urlAportesRecibidos());
  });
});
