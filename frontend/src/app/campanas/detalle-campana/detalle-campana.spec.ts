import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsBo from '@angular/common/locales/es-BO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { paginaDePrueba, urlHistorial } from '../../../testing/aportes-de-prueba';
import {
  CAMPANA_PUBLICADA_PRUEBA,
  HISTORIAL_ESTADOS_PRUEBA,
  ID_CAMPANA_PRUEBA,
  urlDetalleCampana,
  urlHistorialEstadosCampana,
} from '../../../testing/campanas-de-prueba';
import { sesionDePrueba, URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { Sesion } from '../../core/sesion/sesion';
import { DetalleCampana } from './detalle-campana';

describe('DetalleCampana', () => {
  let fixture: ComponentFixture<DetalleCampana>;
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
    fixture = TestBed.createComponent(DetalleCampana);
    fixture.componentRef.setInput('id', ID_CAMPANA_PRUEBA);
    TestBed.tick();
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  const pantalla = () => fixture.nativeElement as HTMLElement;

  it('muestra el título, la historia, el progreso y las secciones de aportes', async () => {
    backend.expectOne(urlDetalleCampana()).flush(CAMPANA_PUBLICADA_PRUEBA);
    const reqHistorialAportes = await vi.waitFor(() => backend.expectOne(urlHistorial()));
    reqHistorialAportes.flush(paginaDePrueba([]));
    await fixture.whenStable();

    expect(pantalla().querySelector('h1')?.textContent).toContain(
      'Libros para la biblioteca comunitaria',
    );
    expect(pantalla().querySelector<HTMLImageElement>('figure.portada img')?.src).toBe(
      `http://api.prueba${CAMPANA_PUBLICADA_PRUEBA.imagenes[0].urlPublica}`,
    );
    expect(pantalla().textContent).toContain('25 % de la meta');
    expect(pantalla().textContent).toContain('1.250,00');
    expect(pantalla().textContent).toContain('5.000,00');
    expect(pantalla().querySelector('app-aportar')).not.toBeNull();
    expect(pantalla().querySelector('app-historial-aportes')).not.toBeNull();
  });

  it('carga el historial de estados cuando quien consulta es el organizador dueño', async () => {
    sesion.iniciar(sesionDePrueba());
    TestBed.tick();

    backend.expectOne(urlDetalleCampana()).flush(CAMPANA_PUBLICADA_PRUEBA);
    const reqHistorialEstados = await vi.waitFor(() =>
      backend.expectOne(urlHistorialEstadosCampana()),
    );
    reqHistorialEstados.flush(HISTORIAL_ESTADOS_PRUEBA);
    const reqHistorialAportes = await vi.waitFor(() => backend.expectOne(urlHistorial()));
    reqHistorialAportes.flush(paginaDePrueba([]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Historial de estados');
    expect(pantalla().textContent).toContain('Campana aprobada y publicada por administracion');
  });
});
