import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsBo from '@angular/common/locales/es-BO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  CAMPANA_PUBLICADA_PRUEBA,
  ID_CAMPANA_PRUEBA,
  paginaCampanasDePrueba,
  RESUMEN_CAMPANA_PRUEBA,
  urlCampanasPorEstado,
  urlDetalleCampana,
} from '../../../testing/campanas-de-prueba';
import { URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { ModeracionCampanas } from './moderacion-campanas';

describe('ModeracionCampanas', () => {
  let fixture: ComponentFixture<ModeracionCampanas>;
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
    fixture = TestBed.createComponent(ModeracionCampanas);
    TestBed.tick();
  });

  afterEach(() => backend.verify());

  const pantalla = () => fixture.nativeElement as HTMLElement;

  it('lista las campañas EN_REVISION y permite aprobar una campaña', async () => {
    const enRevision = { ...RESUMEN_CAMPANA_PRUEBA, estado: 'EN_REVISION' as const };
    backend
      .expectOne(urlCampanasPorEstado('EN_REVISION'))
      .flush(paginaCampanasDePrueba([enRevision]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Libros para la biblioteca comunitaria');
    expect(pantalla().textContent).toContain('Aprobar y publicar');

    const botonAprobar = Array.from(pantalla().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Aprobar y publicar'),
    );
    botonAprobar?.click();

    const reqAprobar = backend.expectOne(`${urlDetalleCampana(ID_CAMPANA_PRUEBA)}/aprobacion`);
    expect(reqAprobar.request.method).toBe('POST');
    reqAprobar.flush(CAMPANA_PUBLICADA_PRUEBA);

    const relectura = await vi.waitFor(() =>
      backend.expectOne(urlCampanasPorEstado('EN_REVISION')),
    );
    relectura.flush(paginaCampanasDePrueba([]));
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('No hay campañas en estado En revisión.');
  });
});
