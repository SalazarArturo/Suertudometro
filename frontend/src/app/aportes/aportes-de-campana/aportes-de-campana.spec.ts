import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsBo from '@angular/common/locales/es-BO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  APORTE_CON_NOMBRE,
  ID_CAMPANA_DE_PRUEBA,
  paginaDePrueba,
  URL_APORTES,
  urlHistorial,
} from '../../../testing/aportes-de-prueba';
import { sesionDePrueba, URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { Sesion } from '../../core/sesion/sesion';
import { AportesDeCampana } from './aportes-de-campana';

describe('AportesDeCampana', () => {
  let fixture: ComponentFixture<AportesDeCampana>;
  let backend: HttpTestingController;
  let sesion: Sesion;

  beforeAll(() => registerLocaleData(localeEsBo));

  beforeEach(() => {
    localStorage.clear();
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
    sesion = TestBed.inject(Sesion);
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  function crear(): void {
    fixture = TestBed.createComponent(AportesDeCampana);
    fixture.componentRef.setInput('idCampana', ID_CAMPANA_DE_PRUEBA);
    TestBed.tick();
  }

  const pantalla = () => fixture.nativeElement as HTMLElement;

  it('sin sesión muestra el historial, que es público, y pide iniciar sesión para aportar', async () => {
    crear();
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([APORTE_CON_NOMBRE]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Ana Pérez');
    expect(pantalla().textContent).toContain('Para aportar necesitas iniciar sesión.');
    expect(pantalla().textContent).not.toContain('Ver los aportes recibidos');
  });

  it('después de aportar vuelve a leer el historial', async () => {
    sesion.iniciar(sesionDePrueba());
    crear();
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([]));
    await fixture.whenStable();
    expect(pantalla().textContent).toContain('Esta campaña todavía no tiene aportes.');

    const monto = pantalla().querySelector<HTMLInputElement>('mat-form-field input')!;
    monto.value = '150';
    monto.dispatchEvent(new Event('input'));
    pantalla().querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    backend
      .expectOne(URL_APORTES)
      .flush({ idAporte: APORTE_CON_NOMBRE.idAporte }, { status: 201, statusText: 'Created' });

    const relectura = await vi.waitFor(() => backend.expectOne(urlHistorial()));
    relectura.flush(paginaDePrueba([APORTE_CON_NOMBRE]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Ana Pérez');
    expect(pantalla().textContent).toContain('150,00');
  });

  it('con sesión enlaza a los aportes recibidos de la campaña', async () => {
    sesion.iniciar(sesionDePrueba());
    crear();
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([]));
    await fixture.whenStable();

    const enlace = Array.from(pantalla().querySelectorAll('a')).find((a) =>
      a.textContent?.includes('Ver los aportes recibidos'),
    );
    expect(enlace?.getAttribute('href')).toBe(`/panel/campanas/${ID_CAMPANA_DE_PRUEBA}/aportes`);
  });
});
