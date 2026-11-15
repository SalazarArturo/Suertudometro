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
  urlMisAportes,
} from '../../../testing/aportes-de-prueba';
import { URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { MisAportes } from './mis-aportes';

describe('MisAportes', () => {
  let fixture: ComponentFixture<MisAportes>;
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
    fixture = TestBed.createComponent(MisAportes);
    TestBed.tick();
  });

  afterEach(() => backend.verify());

  const pantalla = () => fixture.nativeElement as HTMLElement;
  const aportes = () => Array.from(pantalla().querySelectorAll('li'));

  it('muestra cada aporte con su campaña, su monto y su fecha', async () => {
    backend.expectOne(urlMisAportes()).flush(paginaDePrueba([APORTE_CON_NOMBRE, APORTE_ANONIMO]));
    await fixture.whenStable();

    expect(aportes()).toHaveLength(2);
    const primero = aportes()[0];
    expect(primero.textContent).toContain('Libros para la biblioteca');
    expect(primero.textContent).toContain('150,00');
    expect(primero.textContent).toContain('14 de noviembre de 2026');
    // El título lleva a la campaña.
    expect(primero.querySelector('a')?.getAttribute('href')).toContain(ID_CAMPANA_DE_PRUEBA);
  });

  it('marca los aportes que se hicieron como anónimo', async () => {
    backend.expectOne(urlMisAportes()).flush(paginaDePrueba([APORTE_CON_NOMBRE, APORTE_ANONIMO]));
    await fixture.whenStable();

    expect(aportes()[0].textContent).not.toContain('Aportaste como anónimo');
    expect(aportes()[1].textContent).toContain('Aportaste como anónimo');
  });

  it('avisa cuando todavía no hay aportes', async () => {
    backend.expectOne(urlMisAportes()).flush(paginaDePrueba([]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Todavía no hiciste ningún aporte.');
  });
});
