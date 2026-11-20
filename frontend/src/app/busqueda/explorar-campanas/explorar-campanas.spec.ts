import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsBo from '@angular/common/locales/es-BO';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom } from 'rxjs';
import { URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { FichaCatalogo } from '../busqueda.model';
import { rutasBusqueda } from '../busqueda.routes';

const ficha: FichaCatalogo = {
  idCampana: 'aa1e0341-152d-4c05-91db-a2643df2240a',
  titulo: 'Libros para el barrio',
  resumen: 'Ampliamos la biblioteca.',
  categoria: 'EDUCACION',
  rutaPortada: '/api/campanas/aa1e0341-152d-4c05-91db-a2643df2240a/imagenes/libros',
  estado: 'PUBLICADA',
  metaFinanciera: '100.00',
  montoRecaudado: '125.00',
  moneda: 'BOB',
  porcentajeAvance: 125,
  cantidadAportes: 2,
  metaAlcanzada: true,
  publicadoEn: '2026-11-20T12:00:00Z',
  fechaLimite: '2026-12-20T12:00:00Z',
};

describe('Explorar campañas', () => {
  let backend: HttpTestingController;
  let arnes: RouterTestingHarness;
  let router: Router;

  beforeAll(() => registerLocaleData(localeEsBo));
  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(rutasBusqueda),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
        { provide: LOCALE_ID, useValue: 'es-BO' },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    arnes = await RouterTestingHarness.create();
  });
  afterEach(() => backend.verify());

  const pantalla = () => arnes.routeNativeElement!;
  const peticion = () =>
    backend.expectOne((req) => req.method === 'GET' && req.url === `${URL_API_PRUEBA}/busqueda`);
  async function abrir(url: string) {
    await arnes.navigateByUrl(url);
    TestBed.tick();
    return peticion();
  }
  async function navegarCon(accion: () => void) {
    const navegacion = firstValueFrom(
      router.events.pipe(filter((e) => e instanceof NavigationEnd)),
    );
    accion();
    await navegacion;
    TestBed.tick();
    return peticion();
  }

  it('carga las publicadas y muestra la portada del gateway, el detalle y el avance real', async () => {
    const solicitud = await abrir('/');
    expect(solicitud.request.params.get('estado')).toBe('PUBLICADA');
    expect(solicitud.request.params.has('orden')).toBe(false);
    expect(pantalla().textContent).toContain('Buscando campañas');
    solicitud.flush({ total: 1, resultados: [ficha] });
    await arnes.fixture.whenStable();
    expect(pantalla().querySelector('h2 a')?.getAttribute('href')).toBe(
      `/campanas/${ficha.idCampana}`,
    );
    expect(pantalla().querySelector('img')?.src).toBe(
      new URL(ficha.rutaPortada, URL_API_PRUEBA).href,
    );
    expect(pantalla().textContent).toContain('125,00 BOB');
    expect(pantalla().textContent).toContain('125 %');
    expect(pantalla().querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')).toBe(
      '100',
    );
  });

  it('restaura filtros desde la URL, conserva la consulta al paginar y vuelve a la primera página al buscar', async () => {
    const inicial = await abrir(
      '/?texto=biblioteca&categoria=EDUCACION&estado=FINALIZADA&orden=popularidad',
    );
    expect(inicial.request.params.get('categoria')).toBe('EDUCACION');
    expect(inicial.request.params.get('estado')).toBe('FINALIZADA');
    expect(inicial.request.params.get('orden')).toBe('popularidad');
    inicial.flush({ total: 21, resultados: [ficha] });
    await arnes.fixture.whenStable();
    const siguiente = await navegarCon(() =>
      pantalla().querySelectorAll('nav button')[1].dispatchEvent(new MouseEvent('click')),
    );
    expect(router.url).toContain('pagina=2');
    expect(siguiente.request.params.get('desplazamiento')).toBe('20');
    expect(siguiente.request.params.get('texto')).toBe('biblioteca');
    siguiente.flush({ total: 21, resultados: [ficha] });
    await arnes.fixture.whenStable();
    const entrada = pantalla().querySelector('input')!;
    expect(entrada.value).toBe('biblioteca');
    entrada.value = '  huerto  ';
    entrada.dispatchEvent(new Event('input'));
    const nueva = await navegarCon(() =>
      pantalla()
        .querySelector('form')!
        .dispatchEvent(new Event('submit', { cancelable: true })),
    );
    expect(nueva.request.params.get('texto')).toBe('huerto');
    expect(nueva.request.params.get('desplazamiento')).toBe('0');
    expect(router.url).not.toContain('pagina=');
    nueva.flush({ total: 0, resultados: [] });
    await arnes.fixture.whenStable();
    expect(pantalla().textContent).toContain('No se encontraron campañas');
  });

  it('cancela lecturas obsoletas y evita solicitar relevancia sin texto', async () => {
    const anterior = await abrir('/?texto=libros');
    const nueva = await abrir('/?orden=relevancia&pagina=-3');
    expect(anterior.cancelled).toBe(true);
    expect(nueva.request.params.has('orden')).toBe(false);
    expect(nueva.request.params.get('desplazamiento')).toBe('0');
    nueva.flush({ total: 0, resultados: [] });
  });

  it('presenta el problema del gateway y permite reintentar la misma consulta', async () => {
    const inicial = await abrir('/?estado=CANCELADA');
    inicial.flush(
      { type: 'about:blank', detail: 'Catálogo en mantenimiento.' },
      { status: 503, statusText: 'Servicio no disponible' },
    );
    await arnes.fixture.whenStable();
    expect(pantalla().querySelector('[role="alert"]')?.textContent).toContain(
      'Catálogo en mantenimiento.',
    );
    pantalla().querySelector<HTMLButtonElement>('.estado button')!.click();
    TestBed.tick();
    const reintento = peticion();
    expect(reintento.request.params.get('estado')).toBe('CANCELADA');
    reintento.flush({ total: 0, resultados: [] });
    await arnes.fixture.whenStable();
    expect(pantalla().textContent).toContain('No se encontraron campañas');
  });
});
