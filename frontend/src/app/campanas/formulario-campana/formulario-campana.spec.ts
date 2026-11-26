import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  CAMPANA_BORRADOR_PRUEBA,
  ID_CAMPANA_PRUEBA,
  urlDetalleCampana,
  urlMisCampanas,
} from '../../../testing/campanas-de-prueba';
import { URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { rutaEditarCampana } from '../campanas.routes';
import { FormularioCampana } from './formulario-campana';

describe('FormularioCampana', () => {
  let fixture: ComponentFixture<FormularioCampana>;
  let backend: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(FormularioCampana);
  });

  afterEach(() => backend.verify());

  const pantalla = () => fixture.nativeElement as HTMLElement;

  function llenarFormularioValido(): void {
    const inputs = pantalla().querySelectorAll('input');
    const textarea = pantalla().querySelector('textarea')!;

    inputs[0].value = CAMPANA_BORRADOR_PRUEBA.titulo;
    inputs[0].dispatchEvent(new Event('input'));

    inputs[1].value = CAMPANA_BORRADOR_PRUEBA.metaFinanciera;
    inputs[1].dispatchEvent(new Event('input'));

    inputs[2].value = '2026-12-31';
    inputs[2].dispatchEvent(new Event('input'));

    textarea.value = CAMPANA_BORRADOR_PRUEBA.historia;
    textarea.dispatchEvent(new Event('input'));
    TestBed.tick();
  }

  it('muestra el formulario vacío en modo creación cuando no recibe id', async () => {
    TestBed.tick();
    await fixture.whenStable();

    expect(pantalla().querySelector('h1')?.textContent).toContain('Crear nueva campaña');
    expect(pantalla().textContent).toContain('Crear borrador');
  });

  it('carga los datos del borrador, sus observaciones e imágenes en modo edición', async () => {
    fixture.componentRef.setInput('id', ID_CAMPANA_PRUEBA);
    TestBed.tick();

    backend.expectOne(urlDetalleCampana()).flush(CAMPANA_BORRADOR_PRUEBA);
    await fixture.whenStable();

    expect(pantalla().querySelector('h1')?.textContent).toContain('Editar borrador de campaña');
    expect(pantalla().textContent).toContain(
      'Por favor adjunta el presupuesto detallado de la librería.',
    );
    expect(pantalla().textContent).toContain('portada.jpg');
    expect(pantalla().querySelector<HTMLImageElement>('.item-imagen img')?.src).toBe(
      `http://api.prueba${CAMPANA_BORRADOR_PRUEBA.imagenes[0].urlPublica}`,
    );
    expect(pantalla().textContent).toContain('Solicitar revisión');
  });

  it('permite reenviar sin editar tras un 503 cuando el borrador no se llegó a crear', async () => {
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    TestBed.tick();
    await fixture.whenStable();

    llenarFormularioValido();
    const boton = pantalla().querySelector<HTMLButtonElement>('button[type="submit"]')!;
    boton.click();

    const primerIntento = await vi.waitFor(() =>
      backend.expectOne({ method: 'POST', url: `${URL_API_PRUEBA}/campanas` }),
    );
    primerIntento.flush(
      { detail: 'El servicio no está disponible temporalmente.' },
      { status: 503, statusText: 'Service Unavailable' },
    );

    const consultaMias = await vi.waitFor(() => backend.expectOne(urlMisCampanas(0)));
    consultaMias.flush({
      elementos: [],
      pagina: 0,
      tamano: 10,
      totalElementos: 0,
      totalPaginas: 0,
    });

    await vi.waitFor(() =>
      expect(pantalla().querySelector('.error-general')?.textContent).toContain(
        'El servicio no está disponible en este momento.',
      ),
    );

    boton.click();
    const segundoIntento = await vi.waitFor(() =>
      backend.expectOne({ method: 'POST', url: `${URL_API_PRUEBA}/campanas` }),
    );
    segundoIntento.flush(CAMPANA_BORRADOR_PRUEBA);

    await vi.waitFor(() =>
      expect(navegar).toHaveBeenCalledWith(rutaEditarCampana(ID_CAMPANA_PRUEBA)),
    );
  });

  it('recupera el borrador ya creado sin duplicarlo cuando la respuesta del POST se pierde', async () => {
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    TestBed.tick();
    await fixture.whenStable();

    llenarFormularioValido();
    const boton = pantalla().querySelector<HTMLButtonElement>('button[type="submit"]')!;
    boton.click();

    const envio = await vi.waitFor(() =>
      backend.expectOne({ method: 'POST', url: `${URL_API_PRUEBA}/campanas` }),
    );
    envio.error(new ProgressEvent('error'));

    const consultaMias = await vi.waitFor(() => backend.expectOne(urlMisCampanas(0)));
    consultaMias.flush({
      elementos: [CAMPANA_BORRADOR_PRUEBA],
      pagina: 0,
      tamano: 10,
      totalElementos: 1,
      totalPaginas: 1,
    });

    await vi.waitFor(() =>
      expect(navegar).toHaveBeenCalledWith(rutaEditarCampana(ID_CAMPANA_PRUEBA)),
    );
    backend.expectNone({ method: 'POST', url: `${URL_API_PRUEBA}/campanas` });
  });
});
