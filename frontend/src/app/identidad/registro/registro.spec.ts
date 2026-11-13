import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  inicioSesionDePrueba,
  PERFIL_DE_PRUEBA,
  problemaDePrueba,
  URL_API_PRUEBA,
} from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { Sesion } from '../../core/sesion/sesion';
import { Registro } from './registro';

const URL_USUARIOS = `${URL_API_PRUEBA}/identidad/usuarios`;
const URL_SESIONES = `${URL_API_PRUEBA}/identidad/sesiones`;

describe('Registro', () => {
  let fixture: ComponentFixture<Registro>;
  let backend: HttpTestingController;
  let sesion: Sesion;
  let router: Router;

  beforeEach(async () => {
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
    router = TestBed.inject(Router);
    fixture = TestBed.createComponent(Registro);
    await fixture.whenStable();
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  const pantalla = () => fixture.nativeElement as HTMLElement;
  /** Los campos en orden: nombre, correo, contraseña y confirmación. */
  const campos = () => Array.from(pantalla().querySelectorAll('mat-form-field'));

  function completar(confirmacion = 'una frase larga'): void {
    const valores = ['Ana Pérez', 'ana@example.org', 'una frase larga', confirmacion];
    pantalla()
      .querySelectorAll('input')
      .forEach((campo, i) => {
        campo.value = valores[i];
        campo.dispatchEvent(new Event('input'));
      });
  }

  const enviar = () => pantalla().querySelector<HTMLButtonElement>('button[type=submit]')?.click();

  it('crea la cuenta, inicia sesión con los mismos datos y vuelve al inicio', async () => {
    const navegar = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    completar();
    enviar();

    const registro = backend.expectOne(URL_USUARIOS);
    expect(registro.request.body).toEqual({
      nombre: 'Ana Pérez',
      correo: 'ana@example.org',
      contrasena: 'una frase larga',
    });
    registro.flush(PERFIL_DE_PRUEBA, { status: 201, statusText: 'Created' });

    const inicio = await vi.waitFor(() => backend.expectOne(URL_SESIONES));
    expect(inicio.request.body).toEqual({
      correo: 'ana@example.org',
      contrasena: 'una frase larga',
    });
    inicio.flush(inicioSesionDePrueba());

    await vi.waitFor(() => expect(navegar).toHaveBeenCalledWith('/'));
    expect(sesion.autenticado()).toBe(true);
  });

  it('avisa si las contraseñas no coinciden, sin enviar nada', async () => {
    completar('otra frase distinta');
    enviar();
    await fixture.whenStable();

    backend.expectNone(URL_USUARIOS);
    expect(campos()[3].textContent).toContain('Las contraseñas no coinciden.');
  });

  it('pone en el correo el error de correo ya registrado', async () => {
    completar();
    enviar();
    backend
      .expectOne(URL_USUARIOS)
      .flush(
        problemaDePrueba('correo-ya-registrado', 409, 'Ya existe una cuenta con ese correo.'),
        {
          status: 409,
          statusText: 'Conflict',
        },
      );

    await vi.waitFor(() =>
      expect(campos()[1].textContent).toContain('Ya existe una cuenta con ese correo.'),
    );
    expect(sesion.autenticado()).toBe(false);
  });

  it('pone en su campo los errores de validación del servidor', async () => {
    completar();
    enviar();
    backend.expectOne(URL_USUARIOS).flush(
      {
        ...problemaDePrueba('validacion', 400, 'Los datos enviados no tienen la forma esperada.'),
        errores: [{ campo: 'nombre', mensaje: 'Es obligatorio y debe ser un texto.' }],
      },
      { status: 400, statusText: 'Bad Request' },
    );

    await vi.waitFor(() =>
      expect(campos()[0].textContent).toContain('Es obligatorio y debe ser un texto.'),
    );
  });

  it('si falla el inicio de sesión automático, manda a iniciar sesión', async () => {
    const navegar = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    completar();
    enviar();
    backend.expectOne(URL_USUARIOS).flush(PERFIL_DE_PRUEBA, { status: 201, statusText: 'Created' });

    const inicio = await vi.waitFor(() => backend.expectOne(URL_SESIONES));
    inicio.flush(null, { status: 503, statusText: 'Service Unavailable' });

    await vi.waitFor(() =>
      expect(navegar).toHaveBeenCalledWith(['/ingresar'], { queryParams: { volverA: undefined } }),
    );
    expect(sesion.autenticado()).toBe(false);
  });
});
