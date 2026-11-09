import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { provideRouter, Router } from '@angular/router';
import { sesionDePrueba } from '../../../../testing/datos-de-prueba';
import { Sesion } from '../../sesion/sesion';
import { BarraSuperior } from './barra-superior';

describe('BarraSuperior', () => {
  let sesion: Sesion;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    sesion = TestBed.inject(Sesion);
  });

  afterEach(() => sesion.cerrar());

  async function crear(): Promise<ComponentFixture<BarraSuperior>> {
    const fixture = TestBed.createComponent(BarraSuperior);
    await fixture.whenStable();
    return fixture;
  }

  async function opcionesDelMenu(fixture: ComponentFixture<BarraSuperior>): Promise<string[]> {
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    await menu.open();
    return Promise.all((await menu.getItems()).map((opcion) => opcion.getText()));
  }

  it('sin sesión ofrece iniciar sesión y crear cuenta', async () => {
    const fixture = await crear();

    const texto = (fixture.nativeElement as HTMLElement).textContent;
    expect(texto).toContain('Iniciar sesión');
    expect(texto).toContain('Crear cuenta');
  });

  it('con sesión muestra el nombre y el menú de la cuenta, sin Administración', async () => {
    sesion.iniciar(sesionDePrueba('USUARIO'));
    const fixture = await crear();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Ana Pérez');
    const opciones = await opcionesDelMenu(fixture);
    expect(opciones.some((opcion) => opcion.includes('Mi perfil'))).toBe(true);
    expect(opciones.some((opcion) => opcion.includes('Administración'))).toBe(false);
  });

  it('al administrador le muestra Administración', async () => {
    sesion.iniciar(sesionDePrueba('ADMINISTRADOR'));
    const fixture = await crear();

    const opciones = await opcionesDelMenu(fixture);
    expect(opciones.some((opcion) => opcion.includes('Administración'))).toBe(true);
  });

  it('cerrar sesión borra la sesión y vuelve al inicio', async () => {
    sesion.iniciar(sesionDePrueba());
    const navegar = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    const fixture = await crear();

    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    await menu.clickItem({ text: /Cerrar sesión/ });

    expect(sesion.autenticado()).toBe(false);
    expect(navegar).toHaveBeenCalledWith('/');
  });
});
