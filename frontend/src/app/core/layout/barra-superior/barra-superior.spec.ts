import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { provideRouter, Router } from '@angular/router';
import { URL_SIN_LEER } from '../../../../testing/avisos-de-prueba';
import { sesionDePrueba, URL_API_PRUEBA } from '../../../../testing/datos-de-prueba';
import { URL_API } from '../../api/url-api';
import { Sesion } from '../../sesion/sesion';
import { BarraSuperior } from './barra-superior';

describe('BarraSuperior', () => {
  let sesion: Sesion;
  let backend: HttpTestingController;
  let fixture: ComponentFixture<BarraSuperior>;

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
    sesion = TestBed.inject(Sesion);
    backend = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    fixture.destroy();
    sesion.cerrar();
    backend.verify();
  });

  async function crear(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(BarraSuperior);
    TestBed.tick();
    // Con sesión, la campanita pregunta cuántos avisos hay sin leer.
    for (const peticion of backend.match(URL_SIN_LEER)) {
      peticion.flush({ cantidad: 2 });
    }
    await fixture.whenStable();
    return fixture.nativeElement as HTMLElement;
  }

  async function opcionesDelMenu(): Promise<string[]> {
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    await menu.open();
    const textos = await Promise.all((await menu.getItems()).map((opcion) => opcion.getText()));
    // El texto del ícono va antes, separado por un salto o pegado.
    return textos.map((texto) => texto.replace(/^[a-z_]+\s*/, '').trim());
  }

  it('sin sesión ofrece iniciar sesión y crear cuenta, sin la campanita', async () => {
    const barra = await crear();

    expect(barra.textContent).toContain('Iniciar sesión');
    expect(barra.textContent).toContain('Crear cuenta');
    expect(barra.querySelector('app-campanita')).toBeNull();
  });

  it('muestra los enlaces principales del mockup, con o sin sesión', async () => {
    const barra = await crear();

    const enlaces = Array.from(barra.querySelectorAll('nav a'));
    expect(enlaces.map((a) => [a.textContent?.trim(), a.getAttribute('href')])).toEqual([
      ['Explorar', '/'],
      ['Crear campaña', '/panel/campanas/nueva'],
      ['Mis aportes', '/aportes/mios'],
    ]);
  });

  it('con sesión muestra el nombre, la campanita y el menú de la cuenta', async () => {
    sesion.iniciar(sesionDePrueba('USUARIO'));
    const barra = await crear();

    expect(barra.textContent).toContain('Ana Pérez');
    expect(barra.querySelector('app-campanita a')?.getAttribute('aria-label')).toBe(
      'Avisos, 2 sin leer',
    );
    expect(await opcionesDelMenu()).toEqual([
      'Mi perfil',
      'Mi panel',
      'Mis campañas',
      'Mis aportes',
      'Crear campaña',
      'Cerrar sesión',
    ]);
  });

  it('al administrador le agrega Administración y la moderación', async () => {
    sesion.iniciar(sesionDePrueba('ADMINISTRADOR'));
    await crear();

    const opciones = await opcionesDelMenu();
    expect(opciones).toContain('Administración');
    expect(opciones).toContain('Moderación de campañas');
  });

  it('cerrar sesión borra la sesión, quita la campanita y vuelve al inicio', async () => {
    sesion.iniciar(sesionDePrueba());
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const barra = await crear();

    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    await menu.clickItem({ text: /Cerrar sesión/ });
    await fixture.whenStable();

    expect(sesion.autenticado()).toBe(false);
    expect(barra.querySelector('app-campanita')).toBeNull();
    expect(navegar).toHaveBeenCalledWith('/');
  });
});
