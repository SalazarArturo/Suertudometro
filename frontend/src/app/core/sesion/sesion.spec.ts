import { TestBed } from '@angular/core/testing';
import { CLAVE_SESION, Sesion } from './sesion';
import { DatosSesion, Rol } from './sesion.model';

const AHORA = new Date('2026-11-08T12:00:00Z');
const UNA_HORA = 60 * 60 * 1000;

const datosSesion = (expiraEn = '2026-11-08T13:00:00Z', rol: Rol = 'USUARIO'): DatosSesion => ({
  tokenAcceso: 'token.de.prueba',
  expiraEn,
  usuario: {
    id: 'e3b68016-9750-41b3-9e34-762dd8346001',
    nombre: 'Ana Pérez',
    correo: 'ana@example.org',
    rol,
  },
});

describe('Sesion', () => {
  beforeEach(() => {
    vi.useFakeTimers({ now: AHORA });
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('empieza sin sesión', () => {
    const sesion = TestBed.inject(Sesion);

    expect(sesion.autenticado()).toBe(false);
    expect(sesion.usuario()).toBeUndefined();
    expect(sesion.token()).toBeUndefined();
  });

  it('al iniciar expone el usuario y el token, y los guarda en localStorage', () => {
    const sesion = TestBed.inject(Sesion);

    sesion.iniciar({ ...datosSesion(), tipoToken: 'Bearer' } as DatosSesion);

    expect(sesion.autenticado()).toBe(true);
    expect(sesion.usuario()?.nombre).toBe('Ana Pérez');
    expect(sesion.token()).toBe('token.de.prueba');
    // Solo se guarda lo necesario: tipoToken no.
    expect(JSON.parse(localStorage.getItem(CLAVE_SESION) ?? '')).toEqual(datosSesion());
  });

  it('marca como administrador solo al rol ADMINISTRADOR', () => {
    const sesion = TestBed.inject(Sesion);

    sesion.iniciar(datosSesion());
    expect(sesion.esAdministrador()).toBe(false);

    sesion.iniciar(datosSesion(undefined, 'ADMINISTRADOR'));
    expect(sesion.esAdministrador()).toBe(true);
  });

  it('restaura al arrancar la sesión guardada', () => {
    localStorage.setItem(CLAVE_SESION, JSON.stringify(datosSesion()));

    const sesion = TestBed.inject(Sesion);

    expect(sesion.usuario()?.correo).toBe('ana@example.org');
  });

  it.each([
    ['vencida', JSON.stringify(datosSesion('2026-11-08T11:59:59Z'))],
    ['sin usuario', JSON.stringify({ tokenAcceso: 'x', expiraEn: '2026-11-08T13:00:00Z' })],
    ['con un rol desconocido', JSON.stringify(datosSesion(undefined, 'ORGANIZADOR' as Rol))],
    ['que no es JSON', 'no es json'],
  ])('descarta y borra una sesión guardada %s', (_caso, guardada) => {
    localStorage.setItem(CLAVE_SESION, guardada);

    const sesion = TestBed.inject(Sesion);

    expect(sesion.autenticado()).toBe(false);
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
  });

  it('se cierra sola cuando vence el token', () => {
    const sesion = TestBed.inject(Sesion);
    sesion.iniciar(datosSesion());

    vi.advanceTimersByTime(UNA_HORA - 1);
    expect(sesion.autenticado()).toBe(true);

    vi.advanceTimersByTime(1);
    expect(sesion.autenticado()).toBe(false);
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
  });

  it('no abre una sesión que ya venció', () => {
    const sesion = TestBed.inject(Sesion);

    sesion.iniciar(datosSesion('2026-11-08T11:00:00Z'));

    expect(sesion.autenticado()).toBe(false);
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
  });

  it('al cerrar borra el token y lo guardado', () => {
    const sesion = TestBed.inject(Sesion);
    sesion.iniciar(datosSesion());

    sesion.cerrar();

    expect(sesion.autenticado()).toBe(false);
    expect(sesion.token()).toBeUndefined();
    expect(localStorage.getItem(CLAVE_SESION)).toBeNull();
  });
});
