import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsBo from '@angular/common/locales/es-BO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  ID_CAMPANA_PRUEBA,
  paginaCampanasDePrueba,
  RESUMEN_CAMPANA_PRUEBA,
  urlMisCampanas,
} from '../../../testing/campanas-de-prueba';
import { URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { MisCampanas } from './mis-campanas';

describe('MisCampanas', () => {
  let fixture: ComponentFixture<MisCampanas>;
  let backend: HttpTestingController;

  beforeAll(() => registerLocaleData(localeEsBo));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
        { provide: LOCALE_ID, useValue: 'es-BO' },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MisCampanas);
    TestBed.tick();
  });

  afterEach(() => backend.verify());

  const pantalla = () => fixture.nativeElement as HTMLElement;

  it('muestra la lista de campañas del organizador con enlace a sus aportes recibidos', async () => {
    backend.expectOne(urlMisCampanas()).flush(paginaCampanasDePrueba([RESUMEN_CAMPANA_PRUEBA]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Libros para la biblioteca comunitaria');
    expect(pantalla().textContent).toContain('1.250,00');
    expect(pantalla().innerHTML).toContain(`/panel/campanas/${ID_CAMPANA_PRUEBA}/aportes`);
  });

  it('avisa cuando el organizador todavía no creó ninguna campaña', async () => {
    backend.expectOne(urlMisCampanas()).flush(paginaCampanasDePrueba([]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Todavía no creaste ninguna campaña.');
  });
});
