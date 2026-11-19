import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { paginaDePrueba, urlHistorial } from '../../testing/aportes-de-prueba';
import {
  CAMPANA_PUBLICADA_PRUEBA,
  ID_CAMPANA_PRUEBA,
  paginaCampanasDePrueba,
  urlCampanasPorEstado,
  urlDetalleCampana,
  urlMisCampanas,
} from '../../testing/campanas-de-prueba';
import { sesionDePrueba, URL_API_PRUEBA } from '../../testing/datos-de-prueba';
import { routes } from '../app.routes';
import { URL_API } from '../core/api/url-api';
import { Sesion } from '../core/sesion/sesion';
import { rutaDetalleCampana, rutaMisCampanas, rutaModeracionCampanas } from './campanas.routes';

describe('rutas de campañas', { timeout: 15000 }, () => {
  let backend: HttpTestingController;
  let sesion: Sesion;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(Sesion);
    router = TestBed.inject(Router);
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  async function navegar(ruta: string): Promise<HTMLElement> {
    const arnes = await RouterTestingHarness.create();
    await arnes.navigateByUrl(ruta);
    TestBed.tick();
    return arnes.routeNativeElement as HTMLElement;
  }

  it('el detalle de una campaña (/campanas/:id) es público', async () => {
    const pantalla = await navegar(rutaDetalleCampana(ID_CAMPANA_PRUEBA).join('/'));
    backend.expectOne(urlDetalleCampana()).flush(CAMPANA_PUBLICADA_PRUEBA);
    const reqHistorial = await vi.waitFor(() => backend.expectOne(urlHistorial()));
    reqHistorial.flush(paginaDePrueba([]));

    expect(pantalla.querySelector('h1')?.textContent).toContain(
      'Libros para la biblioteca comunitaria',
    );
  });

  it('"Mis campañas" (/panel/campanas) pide sesión', async () => {
    await navegar(rutaMisCampanas().join('/'));

    expect(router.url).toBe('/ingresar?volverA=%2Fpanel%2Fcampanas');
  });

  it('"Mis campañas" se abre con sesión de usuario', async () => {
    sesion.iniciar(sesionDePrueba('USUARIO'));
    const pantalla = await navegar(rutaMisCampanas().join('/'));
    backend.expectOne(urlMisCampanas()).flush(paginaCampanasDePrueba([]));

    expect(pantalla.querySelector('h1')?.textContent).toContain('Mis campañas');
  });

  it('la bandeja de moderación (/administracion/campanas) exige rol ADMINISTRADOR', async () => {
    sesion.iniciar(sesionDePrueba('USUARIO'));
    await navegar(rutaModeracionCampanas().join('/'));

    expect(router.url).toBe('/');
  });

  it('la bandeja de moderación se abre con rol ADMINISTRADOR', async () => {
    sesion.iniciar(sesionDePrueba('ADMINISTRADOR'));
    const pantalla = await navegar(rutaModeracionCampanas().join('/'));
    backend.expectOne(urlCampanasPorEstado('EN_REVISION')).flush(paginaCampanasDePrueba([]));

    expect(pantalla.querySelector('h1')?.textContent).toContain('Moderación de campañas');
  });
});
