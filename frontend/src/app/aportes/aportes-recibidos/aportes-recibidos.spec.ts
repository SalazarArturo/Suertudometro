import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsBo from '@angular/common/locales/es-BO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  APORTE_ANONIMO,
  APORTE_CON_NOMBRE,
  ID_CAMPANA_DE_PRUEBA,
  paginaDePrueba,
  urlAportesRecibidos,
} from '../../../testing/aportes-de-prueba';
import { problemaDePrueba, URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { AportesRecibidos } from './aportes-recibidos';

describe('AportesRecibidos', () => {
  let fixture: ComponentFixture<AportesRecibidos>;
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
    fixture = TestBed.createComponent(AportesRecibidos);
    fixture.componentRef.setInput('idCampana', ID_CAMPANA_DE_PRUEBA);
    TestBed.tick();
  });

  afterEach(() => backend.verify());

  const pantalla = () => fixture.nativeElement as HTMLElement;
  const aportes = () => Array.from(pantalla().querySelectorAll('li'));

  it('muestra los aportes de la campaña, con su título y el total', async () => {
    backend
      .expectOne(urlAportesRecibidos())
      .flush(paginaDePrueba([APORTE_CON_NOMBRE, APORTE_ANONIMO]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Libros para la biblioteca · 2 aportes.');
    expect(aportes()).toHaveLength(2);
    expect(aportes()[0].textContent).toContain('Ana Pérez');
    expect(aportes()[0].textContent).toContain('150,00');
  });

  it('tampoco al organizador le muestra el nombre de un aporte anónimo', async () => {
    backend.expectOne(urlAportesRecibidos()).flush(paginaDePrueba([APORTE_ANONIMO]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Libros para la biblioteca · 1 aporte.');
    expect(aportes()[0].textContent).toContain('Anónimo');
  });

  it('si no es el organizador ni un administrador, muestra el mensaje del servidor', async () => {
    backend
      .expectOne(urlAportesRecibidos())
      .flush(
        problemaDePrueba(
          'acceso-denegado',
          403,
          'Solo el organizador de la campaña o la administración pueden ver los aportes recibidos.',
        ),
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    expect(pantalla().querySelector('[role=alert]')?.textContent).toContain(
      'Solo el organizador de la campaña o la administración',
    );
    expect(aportes()).toHaveLength(0);
  });

  it('avisa cuando la campaña todavía no recibió aportes', async () => {
    backend.expectOne(urlAportesRecibidos()).flush(paginaDePrueba([]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Esta campaña todavía no recibió aportes.');
  });
});
