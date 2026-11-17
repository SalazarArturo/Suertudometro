import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ID_CAMPANA_DE_PRUEBA, URL_APORTES } from '../../../testing/aportes-de-prueba';
import { problemaDePrueba, sesionDePrueba, URL_API_PRUEBA } from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { Sesion } from '../../core/sesion/sesion';
import { Aportar } from './aportar';

describe('Aportar', () => {
  let fixture: ComponentFixture<Aportar>;
  let backend: HttpTestingController;
  let sesion: Sesion;
  let aportados: string[];

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: URL_API, useValue: URL_API_PRUEBA },
      ],
    });
    backend = TestBed.inject(HttpTestingController);
    sesion = TestBed.inject(Sesion);
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  async function crear(conSesion = true): Promise<void> {
    if (conSesion) {
      sesion.iniciar(sesionDePrueba());
    }
    fixture = TestBed.createComponent(Aportar);
    fixture.componentRef.setInput('idCampana', ID_CAMPANA_DE_PRUEBA);
    aportados = [];
    fixture.componentInstance.aportado.subscribe((idAporte) => aportados.push(idAporte));
    await fixture.whenStable();
  }

  const pantalla = () => fixture.nativeElement as HTMLElement;
  /** Los campos en orden: monto y mensaje de apoyo. */
  const campos = () => Array.from(pantalla().querySelectorAll('mat-form-field'));
  const campoMonto = () => pantalla().querySelector<HTMLInputElement>('mat-form-field input')!;
  const campoMensaje = () => pantalla().querySelector<HTMLTextAreaElement>('textarea')!;

  function escribir(campo: HTMLInputElement | HTMLTextAreaElement, texto: string): void {
    campo.value = texto;
    campo.dispatchEvent(new Event('input'));
  }

  const marcarAnonimo = () =>
    pantalla().querySelector<HTMLInputElement>('mat-checkbox input')?.click();
  const enviar = () => pantalla().querySelector<HTMLButtonElement>('button[type=submit]')?.click();

  it('sin sesión no muestra el formulario y ofrece iniciar sesión', async () => {
    await crear(false);

    expect(pantalla().querySelector('form')).toBeNull();
    expect(pantalla().textContent).toContain('Para aportar necesitas iniciar sesión.');
    const enlace = pantalla().querySelector('a');
    expect(enlace?.textContent).toContain('Iniciar sesión');
    expect(enlace?.getAttribute('href')).toContain('/ingresar?volverA=');
  });

  it('registra el aporte con el monto como texto y avisa que quedó registrado', async () => {
    await crear();
    escribir(campoMonto(), ' 150,5 ');
    escribir(campoMensaje(), '  ¡Mucho éxito con la campaña!  ');
    enviar();

    const enviada = backend.expectOne(URL_APORTES);
    expect(enviada.request.method).toBe('POST');
    expect(enviada.request.body).toEqual({
      idCampana: ID_CAMPANA_DE_PRUEBA,
      // Con punto decimal y sin espacios, como lo espera el API.
      monto: '150.5',
      moneda: 'BOB',
      mensajeApoyo: '¡Mucho éxito con la campaña!',
      esAnonimo: false,
    });
    enviada.flush({ idAporte: 'aporte-1' }, { status: 201, statusText: 'Created' });

    await vi.waitFor(() => expect(aportados).toEqual(['aporte-1']));
    await fixture.whenStable();
    // El formulario queda listo para otro aporte.
    expect(campoMonto().value).toBe('');
    expect(campoMensaje().value).toBe('');
    expect(pantalla().querySelector('mat-error')).toBeNull();
  });

  it('un aporte anónimo y sin mensaje envía esAnonimo y el mensaje en null', async () => {
    await crear();
    expect(pantalla().textContent).toContain('Tu aporte se mostrará con tu nombre: Ana Pérez.');

    escribir(campoMonto(), '20');
    marcarAnonimo();
    await fixture.whenStable();
    expect(pantalla().textContent).toContain('Tu nombre no se mostrará a nadie');
    enviar();

    const enviada = backend.expectOne(URL_APORTES);
    expect(enviada.request.body).toEqual({
      idCampana: ID_CAMPANA_DE_PRUEBA,
      monto: '20',
      moneda: 'BOB',
      mensajeApoyo: null,
      esAnonimo: true,
    });
    enviada.flush({ idAporte: 'aporte-2' }, { status: 201, statusText: 'Created' });
    await vi.waitFor(() => expect(aportados).toEqual(['aporte-2']));
  });

  it.each([
    ['', 'Escribe el monto de tu aporte.'],
    ['abc', 'Escribe un monto con dos decimales como máximo'],
    ['150.123', 'Escribe un monto con dos decimales como máximo'],
    ['-5', 'Escribe un monto con dos decimales como máximo'],
    ['0', 'El monto debe ser mayor que cero.'],
  ])('con el monto "%s" avisa en el campo y no envía nada', async (monto, mensaje) => {
    await crear();
    escribir(campoMonto(), monto);
    enviar();
    await fixture.whenStable();

    backend.expectNone(URL_APORTES);
    expect(campos()[0].textContent).toContain(mensaje);
    expect(aportados).toEqual([]);
  });

  it('cuenta los caracteres del mensaje y no deja pasar de 300', async () => {
    await crear();
    expect(campos()[1].textContent).toContain('0 / 300');

    escribir(campoMensaje(), '¡Ánimo! 🎉');
    await fixture.whenStable();
    // Un emoji cuenta como un solo carácter, igual que en el backend.
    expect(campos()[1].textContent).toContain('9 / 300');

    escribir(campoMonto(), '10');
    escribir(campoMensaje(), 'a'.repeat(301));
    enviar();
    await fixture.whenStable();

    backend.expectNone(URL_APORTES);
    expect(campos()[1].textContent).toContain('El mensaje puede tener hasta 300 caracteres.');
  });

  it('si la campaña ya no acepta aportes, muestra el mensaje del servidor', async () => {
    await crear();
    escribir(campoMonto(), '150');
    enviar();
    backend
      .expectOne(URL_APORTES)
      .flush(
        problemaDePrueba(
          'campana-no-acepta-aportes',
          409,
          'La campaña ya finalizó y no recibe más aportes.',
        ),
        { status: 409, statusText: 'Conflict' },
      );

    await vi.waitFor(() =>
      expect(pantalla().querySelector('[role=alert]')?.textContent).toContain(
        'La campaña ya finalizó y no recibe más aportes.',
      ),
    );
    expect(aportados).toEqual([]);
    // Lo escrito no se pierde.
    expect(campoMonto().value).toBe('150');
  });

  it('pone en el monto el error de monto inválido del servidor', async () => {
    await crear();
    escribir(campoMonto(), '150');
    enviar();
    backend
      .expectOne(URL_APORTES)
      .flush(
        problemaDePrueba('monto-invalido', 400, 'El monto del aporte debe ser mayor que cero.'),
        {
          status: 400,
          statusText: 'Bad Request',
        },
      );

    await vi.waitFor(() =>
      expect(campos()[0].textContent).toContain('El monto del aporte debe ser mayor que cero.'),
    );
  });

  it('pone en su campo los errores de validación del servidor', async () => {
    await crear();
    escribir(campoMonto(), '150');
    enviar();
    backend.expectOne(URL_APORTES).flush(
      {
        ...problemaDePrueba('validacion', 400, 'Los datos enviados no son válidos.'),
        errores: [{ campo: 'monto', mensaje: 'El monto es obligatorio.' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await vi.waitFor(() => expect(campos()[0].textContent).toContain('El monto es obligatorio.'));
  });
});
