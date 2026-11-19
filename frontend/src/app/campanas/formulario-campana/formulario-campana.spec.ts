import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import {
  CAMPANA_BORRADOR_PRUEBA,
  ID_CAMPANA_PRUEBA,
  urlDetalleCampana,
} from '../../../testing/campanas-de-prueba';
import { URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { FormularioCampana } from './formulario-campana';

describe('FormularioCampana', () => {
  let fixture: ComponentFixture<FormularioCampana>;
  let backend: HttpTestingController;

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
    fixture = TestBed.createComponent(FormularioCampana);
  });

  afterEach(() => backend.verify());

  const pantalla = () => fixture.nativeElement as HTMLElement;

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
    expect(pantalla().textContent).toContain('Solicitar revisión');
  });
});
