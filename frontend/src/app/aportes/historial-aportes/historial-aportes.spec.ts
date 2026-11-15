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
  urlHistorial,
} from '../../../testing/aportes-de-prueba';
import { URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { HistorialAportes } from './historial-aportes';

describe('HistorialAportes', () => {
  let fixture: ComponentFixture<HistorialAportes>;
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
    fixture = TestBed.createComponent(HistorialAportes);
    fixture.componentRef.setInput('idCampana', ID_CAMPANA_DE_PRUEBA);
    // httpResource pide el historial cuando corren los efectos.
    TestBed.tick();
  });

  afterEach(() => backend.verify());

  const pantalla = () => fixture.nativeElement as HTMLElement;
  const aportes = () => Array.from(pantalla().querySelectorAll('li'));
  const boton = (texto: string) =>
    Array.from(pantalla().querySelectorAll('button')).find((b) => b.textContent?.includes(texto));

  it('muestra el nombre, el monto, el mensaje y la fecha de cada aporte', async () => {
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([APORTE_CON_NOMBRE, APORTE_ANONIMO]));
    await fixture.whenStable();

    expect(aportes()).toHaveLength(2);
    const conNombre = aportes()[0].textContent;
    expect(conNombre).toContain('Ana Pérez');
    // El dinero llega como texto ("150.00") y se muestra con el formato de Bolivia.
    expect(conNombre).toContain('150,00');
    expect(conNombre).toContain('¡Mucho éxito con la campaña!');
    expect(conNombre).toContain('14 de noviembre de 2026');
  });

  it('muestra "Anónimo" cuando el aporte no trae nombre', async () => {
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([APORTE_CON_NOMBRE, APORTE_ANONIMO]));
    await fixture.whenStable();

    const anonimo = aportes()[1].textContent;
    expect(anonimo).toContain('Anónimo');
    expect(anonimo).toContain('20,50');
    expect(anonimo).not.toContain('Ana Pérez');
  });

  it('avisa cuando la campaña todavía no tiene aportes', async () => {
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([]));
    await fixture.whenStable();

    expect(aportes()).toHaveLength(0);
    expect(pantalla().textContent).toContain('Esta campaña todavía no tiene aportes.');
  });

  it('si falla, muestra el error y permite reintentar', async () => {
    backend.expectOne(urlHistorial()).flush(null, { status: 503, statusText: 'Unavailable' });
    await fixture.whenStable();

    expect(pantalla().querySelector('[role=alert]')?.textContent).toContain('no está disponible');

    boton('Reintentar')?.click();
    TestBed.tick();
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([APORTE_CON_NOMBRE]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Ana Pérez');
  });

  it('con una sola página no muestra los botones de páginas', async () => {
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([APORTE_CON_NOMBRE]));
    await fixture.whenStable();

    expect(pantalla().querySelector('nav')).toBeNull();
  });

  it('pasa a la página siguiente y vuelve a la anterior', async () => {
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([APORTE_CON_NOMBRE], 1, 2));
    await fixture.whenStable();

    expect(pantalla().querySelector('nav')?.textContent).toContain('Página 1 de 2');
    expect(boton('Anterior')?.disabled).toBe(true);

    boton('Siguiente')?.click();
    TestBed.tick();
    backend.expectOne(urlHistorial(2)).flush(paginaDePrueba([APORTE_ANONIMO], 2, 2));
    await fixture.whenStable();

    expect(pantalla().querySelector('nav')?.textContent).toContain('Página 2 de 2');
    expect(pantalla().textContent).toContain('Anónimo');
    expect(boton('Siguiente')?.disabled).toBe(true);

    boton('Anterior')?.click();
    TestBed.tick();
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([APORTE_CON_NOMBRE], 1, 2));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Ana Pérez');
  });

  it('recargar() vuelve a pedir la primera página', async () => {
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([]));
    await fixture.whenStable();

    fixture.componentInstance.recargar();
    TestBed.tick();
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([APORTE_CON_NOMBRE]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Ana Pérez');
  });
});
