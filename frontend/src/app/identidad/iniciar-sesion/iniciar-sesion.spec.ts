import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import type { MockInstance } from 'vitest';
import {
  inicioSesionDePrueba,
  problemaDePrueba,
  URL_API_PRUEBA,
} from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { Sesion } from '../../core/sesion/sesion';
import { IniciarSesion } from './iniciar-sesion';

const URL_SESIONES = `${URL_API_PRUEBA}/identidad/sesiones`;

describe('IniciarSesion', () => {
  let fixture: ComponentFixture<IniciarSesion>;
  let backend: HttpTestingController;
  let sesion: Sesion;
  let navegar: MockInstance<Router['navigateByUrl']>;

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
    navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(IniciarSesion);
    await fixture.whenStable();
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  const pantalla = () => fixture.nativeElement as HTMLElement;

  function escribir(selector: string, valor: string): void {
    const campo = pantalla().querySelector<HTMLInputElement>(selector);
    if (!campo) throw new Error(`No hay un campo ${selector}`);
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function completarYEnviar(): void {
    escribir('input[type=email]', 'ana@example.org');
    escribir('input[type=password]', 'una frase larga');
    pantalla().querySelector<HTMLButtonElement>('button[type=submit]')?.click();
  }

  it('inicia sesión, guarda la sesión y vuelve a la ruta pedida', async () => {
    fixture.componentRef.setInput('volverA', '/perfil');

    completarYEnviar();
    const peticion = backend.expectOne(URL_SESIONES);
    expect(peticion.request.method).toBe('POST');
    expect(peticion.request.body).toEqual({
      correo: 'ana@example.org',
      contrasena: 'una frase larga',
    });
    peticion.flush(inicioSesionDePrueba());

    await vi.waitFor(() => expect(navegar).toHaveBeenCalledWith('/perfil'));
    expect(sesion.usuario()?.nombre).toBe('Ana Pérez');
  });

  it('no envía nada si faltan datos, y lo dice en cada campo', async () => {
    pantalla().querySelector<HTMLButtonElement>('button[type=submit]')?.click();
    await fixture.whenStable();

    backend.expectNone(URL_SESIONES);
    expect(pantalla().textContent).toContain('Escribe tu correo.');
    expect(pantalla().textContent).toContain('Escribe tu contraseña.');
  });

  it('muestra el detalle de credenciales inválidas, sin abrir sesión', async () => {
    completarYEnviar();
    backend
      .expectOne(URL_SESIONES)
      .flush(
        problemaDePrueba(
          'credenciales-invalidas',
          401,
          'El correo o la contraseña no son correctos.',
        ),
        { status: 401, statusText: 'Unauthorized' },
      );

    await vi.waitFor(() =>
      expect(pantalla().querySelector('[role=alert]')?.textContent).toContain(
        'El correo o la contraseña no son correctos.',
      ),
    );
    expect(sesion.autenticado()).toBe(false);
    expect(navegar).not.toHaveBeenCalled();
  });

  it('avisa cuando llega porque la sesión venció', async () => {
    fixture.componentRef.setInput('motivo', 'sesion-vencida');
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Tu sesión venció');
  });

  it('no vuelve a una dirección de otro sitio', async () => {
    fixture.componentRef.setInput('volverA', '//sitio-falso.com');

    completarYEnviar();
    backend.expectOne(URL_SESIONES).flush(inicioSesionDePrueba());

    await vi.waitFor(() => expect(navegar).toHaveBeenCalledWith('/'));
  });
});
