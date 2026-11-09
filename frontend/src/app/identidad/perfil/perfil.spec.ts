import { registerLocaleData } from '@angular/common';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import localeEsBo from '@angular/common/locales/es-BO';
import { LOCALE_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import {
  PERFIL_DE_PRUEBA,
  problemaDePrueba,
  sesionDePrueba,
  URL_API_PRUEBA,
} from '../../../testing/datos-de-prueba';
import { URL_API } from '../../core/api/url-api';
import { Sesion } from '../../core/sesion/sesion';
import { Perfil } from './perfil';

const URL_PERFIL = `${URL_API_PRUEBA}/identidad/perfil`;

describe('Perfil', () => {
  let fixture: ComponentFixture<Perfil>;
  let backend: HttpTestingController;
  let sesion: Sesion;

  beforeAll(() => registerLocaleData(localeEsBo));

  beforeEach(() => {
    localStorage.clear();
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
    sesion = TestBed.inject(Sesion);
    sesion.iniciar(sesionDePrueba());
    fixture = TestBed.createComponent(Perfil);
    // httpResource pide el perfil cuando corren los efectos.
    TestBed.tick();
  });

  afterEach(() => {
    backend.verify();
    sesion.cerrar();
  });

  const pantalla = () => fixture.nativeElement as HTMLElement;
  const boton = (texto: string) =>
    Array.from(pantalla().querySelectorAll('button')).find((b) => b.textContent?.includes(texto));

  it('muestra el nombre, el correo, el rol y la fecha de registro', async () => {
    backend.expectOne(URL_PERFIL).flush(PERFIL_DE_PRUEBA);
    await fixture.whenStable();

    const texto = pantalla().textContent;
    expect(texto).toContain('Ana Pérez');
    expect(texto).toContain('ana@example.org');
    expect(texto).toContain('Usuario');
    expect(texto).toContain('7 de noviembre de 2026');
  });

  it('si falla, muestra el error y permite reintentar', async () => {
    backend.expectOne(URL_PERFIL).flush(null, { status: 503, statusText: 'Service Unavailable' });
    await fixture.whenStable();

    expect(pantalla().querySelector('[role=alert]')?.textContent).toContain('no está disponible');

    boton('Reintentar')?.click();
    TestBed.tick();
    backend.expectOne(URL_PERFIL).flush(PERFIL_DE_PRUEBA);
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Ana Pérez');
  });

  it('si la cuenta ya no existe, ofrece cerrar sesión', async () => {
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    backend
      .expectOne(URL_PERFIL)
      .flush(problemaDePrueba('usuario-no-encontrado', 404, 'No existe una cuenta.'), {
        status: 404,
        statusText: 'Not Found',
      });
    await fixture.whenStable();

    expect(pantalla().textContent).toContain('Tu cuenta ya no existe');
    boton('Cerrar sesión')?.click();

    expect(sesion.autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith('/ingresar');
  });
});
