import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import {
  ID_CAMPANA_DE_PRUEBA,
  paginaDePrueba,
  urlAportesRecibidos,
  urlHistorial,
  urlMisAportes,
} from '../../testing/aportes-de-prueba';
import { sesionDePrueba, URL_API_PRUEBA } from '../../testing/datos-de-prueba';
import { routes } from '../app.routes';
import { URL_API } from '../core/api/url-api';
import { Sesion } from '../core/sesion/sesion';
import { rutaDeAportesRecibidos, rutaDeCampana } from './aportes.routes';

/** Las rutas de aportes dentro de las rutas reales de la aplicación (`app.routes.ts`). */
describe('rutas de aportes', () => {
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

  it('"Mis aportes" pide sesión: sin ella manda a iniciar sesión y vuelve después', async () => {
    await navegar('/aportes/mios');

    expect(router.url).toBe('/ingresar?volverA=%2Faportes%2Fmios');
  });

  it('"Mis aportes" se abre con sesión', async () => {
    sesion.iniciar(sesionDePrueba());
    const pantalla = await navegar('/aportes/mios');
    backend.expectOne(urlMisAportes()).flush(paginaDePrueba([]));

    expect(router.url).toBe('/aportes/mios');
    expect(pantalla.querySelector('h1')?.textContent).toContain('Mis aportes');
  });

  it('"Aportes recibidos" pide sesión', async () => {
    const ruta = rutaDeAportesRecibidos(ID_CAMPANA_DE_PRUEBA).join('/');
    await navegar(ruta);

    expect(router.url).toBe(`/ingresar?volverA=${encodeURIComponent(ruta)}`);
  });

  it('"Aportes recibidos" recibe la campaña de la ruta', async () => {
    sesion.iniciar(sesionDePrueba());
    const pantalla = await navegar(rutaDeAportesRecibidos(ID_CAMPANA_DE_PRUEBA).join('/'));
    backend.expectOne(urlAportesRecibidos()).flush(paginaDePrueba([]));

    expect(pantalla.querySelector('h1')?.textContent).toContain('Aportes recibidos');
  });

  it('la página de aportes de una campaña es pública', async () => {
    const pantalla = await navegar(rutaDeCampana(ID_CAMPANA_DE_PRUEBA).join('/'));
    backend.expectOne(urlHistorial()).flush(paginaDePrueba([]));

    expect(pantalla.querySelector('h1')?.textContent).toContain('Aportes de la campaña');
  });

  it('el inicio del panel del organizador sigue en /panel', async () => {
    sesion.iniciar(sesionDePrueba());
    const pantalla = await navegar('/panel');

    expect(pantalla.querySelector('h1')?.textContent).toContain('Mi panel');
  });
});
