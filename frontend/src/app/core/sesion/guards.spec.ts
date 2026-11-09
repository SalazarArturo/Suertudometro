import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { sesionDePrueba } from '../../../testing/datos-de-prueba';
import { guardInvitado, guardRol, guardSesion } from './guards';
import { Sesion } from './sesion';

describe('guards de sesión', () => {
  let sesion: Sesion;
  let router: Router;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    sesion = TestBed.inject(Sesion);
    router = TestBed.inject(Router);
  });

  afterEach(() => sesion.cerrar());

  const ejecutar = (guard: CanActivateFn, url = '/perfil') =>
    TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  const destino = (resultado: unknown) => router.serializeUrl(resultado as UrlTree);
  const ingresarVolviendoA = (volverA: string) =>
    router.serializeUrl(router.createUrlTree(['/ingresar'], { queryParams: { volverA } }));

  describe('guardSesion', () => {
    it('deja pasar a quien tiene sesión', () => {
      sesion.iniciar(sesionDePrueba());

      expect(ejecutar(guardSesion)).toBe(true);
    });

    it('sin sesión manda a iniciar sesión y recuerda la ruta', () => {
      expect(destino(ejecutar(guardSesion))).toBe(ingresarVolviendoA('/perfil'));
    });
  });

  describe('guardRol', () => {
    const soloAdministrador = guardRol('ADMINISTRADOR');

    it('deja pasar a quien tiene el rol', () => {
      sesion.iniciar(sesionDePrueba('ADMINISTRADOR'));

      expect(ejecutar(soloAdministrador, '/administracion')).toBe(true);
    });

    it('con otro rol manda al inicio', () => {
      sesion.iniciar(sesionDePrueba('USUARIO'));

      expect(destino(ejecutar(soloAdministrador, '/administracion'))).toBe('/');
    });

    it('sin sesión manda a iniciar sesión y recuerda la ruta', () => {
      expect(destino(ejecutar(soloAdministrador, '/administracion'))).toBe(
        ingresarVolviendoA('/administracion'),
      );
    });
  });

  describe('guardInvitado', () => {
    it('deja pasar a quien no tiene sesión', () => {
      expect(ejecutar(guardInvitado, '/ingresar')).toBe(true);
    });

    it('a quien ya tiene sesión lo manda al inicio', () => {
      sesion.iniciar(sesionDePrueba());

      expect(destino(ejecutar(guardInvitado, '/ingresar'))).toBe('/');
    });
  });
});
