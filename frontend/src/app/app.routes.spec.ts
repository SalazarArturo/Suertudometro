import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { urlBandeja } from '../testing/avisos-de-prueba';
import { sesionDePrueba, URL_API_PRUEBA } from '../testing/datos-de-prueba';
import { routes } from './app.routes';
import { URL_API } from './core/api/url-api';
import { BarraSuperior } from './core/layout/barra-superior/barra-superior';
import { Rol } from './core/sesion/sesion.model';
import { Sesion } from './core/sesion/sesion';
import { PaginaNoEncontrada } from './shared/pagina-no-encontrada/pagina-no-encontrada';
import { PanelAdministracion } from './zonas/panel-administracion/panel-administracion';
import { PanelOrganizador } from './zonas/panel-organizador/panel-organizador';

/** Los enlaces de la base contra las rutas reales de la aplicación. */
describe('enlaces de la aplicación', () => {
  let backend: HttpTestingController;
  let sesion: Sesion;

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
  });

  afterEach(() => sesion.cerrar());

  /** Los destinos de un componente: los enlaces a la vista y los del menú de la cuenta. */
  async function destinos(componente: Type<unknown>): Promise<string[]> {
    const fixture = TestBed.createComponent(componente);
    TestBed.tick();
    backend.match(() => true).forEach((peticion) => peticion.flush({ cantidad: 0 }));
    await fixture.whenStable();
    const elemento = fixture.nativeElement as HTMLElement;
    elemento.querySelector<HTMLElement>('[aria-haspopup=menu]')?.click();
    await fixture.whenStable();
    const enlaces = [
      ...elemento.querySelectorAll('a[href]'),
      ...document.querySelectorAll('.cdk-overlay-container a[href]'),
    ].map((a) => a.getAttribute('href')!);
    fixture.destroy();
    return [...new Set(enlaces)];
  }

  it.each<[string, Type<unknown>, Rol, number]>([
    ['la barra de un usuario', BarraSuperior, 'USUARIO', 7],
    ['la barra del administrador', BarraSuperior, 'ADMINISTRADOR', 9],
    ['Mi panel', PanelOrganizador, 'USUARIO', 5],
    ['Administración', PanelAdministracion, 'ADMINISTRADOR', 1],
  ])('en %s, todos llevan a una pantalla que existe', async (_, componente, rol, cantidad) => {
    sesion.iniciar(sesionDePrueba(rol));
    const rutas = await destinos(componente);
    expect(rutas).toHaveLength(cantidad);

    const arnes = await RouterTestingHarness.create();
    for (const ruta of rutas) {
      await arnes.navigateByUrl(ruta);
      expect(TestBed.inject(Router).url).toBe(ruta);
      const pantalla: unknown = arnes.routeDebugElement?.componentInstance;
      expect(pantalla, ruta).toBeInstanceOf(Object);
      expect(pantalla, ruta).not.toBeInstanceOf(PaginaNoEncontrada);
    }
  });

  it('un enlace mal escrito se detectaría', async () => {
    sesion.iniciar(sesionDePrueba());
    const arnes = await RouterTestingHarness.create();
    await arnes.navigateByUrl('/avisitos');
    expect(arnes.routeDebugElement?.componentInstance).toBeInstanceOf(PaginaNoEncontrada);
  });

  it('la bandeja pide sesión y después vuelve', async () => {
    const arnes = await RouterTestingHarness.create();
    await arnes.navigateByUrl('/avisos');
    expect(TestBed.inject(Router).url).toBe('/ingresar?volverA=%2Favisos');
  });

  it('publicar novedades pide sesión y conserva el destino', async () => {
    const arnes = await RouterTestingHarness.create();
    await arnes.navigateByUrl('/panel/novedades');
    expect(TestBed.inject(Router).url).toBe('/ingresar?volverA=%2Fpanel%2Fnovedades');
  });

  it('la bandeja se abre con sesión', async () => {
    sesion.iniciar(sesionDePrueba());
    const arnes = await RouterTestingHarness.create();
    await arnes.navigateByUrl('/avisos');
    TestBed.tick();

    backend.expectOne(urlBandeja());
    expect(arnes.routeNativeElement?.querySelector('h1')?.textContent).toContain('Avisos');
  });
});
