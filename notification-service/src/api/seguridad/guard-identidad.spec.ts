import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { NoAutenticado } from '../errores/error-de-api.js';
import { GuardIdentidad } from './guard-identidad.js';
import { Publico } from './publico.decorador.js';
import type { PeticionConIdentidad } from './usuario-autenticado.js';

const ID = 'e3b68016-9750-41b3-9e34-762dd8346001';

class ControladorMixto {
  @Publico()
  publica(): void {}

  conSesion(): void {}
}

@Publico()
class ControladorPublico {
  ruta(): void {}
}

/** Una petición de Express mínima: `header()` no distingue mayúsculas. */
function crearPeticion(headers: Record<string, string>): PeticionConIdentidad {
  const normalizados = Object.fromEntries(
    Object.entries(headers).map(([nombre, valor]) => [
      nombre.toLowerCase(),
      valor,
    ]),
  );
  return {
    header: (nombre: string) => normalizados[nombre.toLowerCase()],
  } as unknown as PeticionConIdentidad;
}

function crearContexto(
  clase: object,
  manejador: () => void,
  peticion: PeticionConIdentidad,
): ExecutionContext {
  return {
    getClass: () => clase,
    getHandler: () => manejador,
    switchToHttp: () => ({ getRequest: () => peticion }),
  } as unknown as ExecutionContext;
}

const IDENTIDAD_COMPLETA = {
  'X-Usuario-Id': ID,
  'X-Usuario-Rol': 'USUARIO',
  'X-Usuario-Nombre': 'Ana%20P%C3%A9rez',
};

describe('GuardIdentidad', () => {
  const guard = new GuardIdentidad(new Reflector());

  const conSesion = (headers: Record<string, string>) => {
    const peticion = crearPeticion(headers);
    const contexto = crearContexto(
      ControladorMixto,
      ControladorMixto.prototype.conSesion,
      peticion,
    );
    return { peticion, activar: () => guard.canActivate(contexto) };
  };

  it('deja pasar una ruta @Publico sin headers', () => {
    const contexto = crearContexto(
      ControladorMixto,
      ControladorMixto.prototype.publica,
      crearPeticion({}),
    );
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('deja pasar todas las rutas de un controlador @Publico', () => {
    const contexto = crearContexto(
      ControladorPublico,
      ControladorPublico.prototype.ruta,
      crearPeticion({}),
    );
    expect(guard.canActivate(contexto)).toBe(true);
  });

  it('en una ruta con sesión, deja en la petición la identidad, con el nombre decodificado', () => {
    const { peticion, activar } = conSesion(IDENTIDAD_COMPLETA);

    expect(activar()).toBe(true);
    expect(peticion.usuario).toEqual({
      id: ID,
      rol: 'USUARIO',
      nombre: 'Ana Pérez',
    });
  });

  it('decodifica la ñ y acepta el rol ADMINISTRADOR', () => {
    const { peticion, activar } = conSesion({
      ...IDENTIDAD_COMPLETA,
      'X-Usuario-Rol': 'ADMINISTRADOR',
      'X-Usuario-Nombre': 'Mar%C3%ADa%20Nu%C3%B1ez',
    });

    activar();
    expect(peticion.usuario).toMatchObject({
      rol: 'ADMINISTRADOR',
      nombre: 'María Nuñez',
    });
  });

  it.each([
    ['falta X-Usuario-Id', { 'X-Usuario-Id': '' }, /X-Usuario-Id/],
    ['el rol no existe', { 'X-Usuario-Rol': 'ORGANIZADOR' }, /X-Usuario-Rol/],
    ['falta el rol', { 'X-Usuario-Rol': '' }, /X-Usuario-Rol/],
    [
      'el nombre no está bien codificado',
      { 'X-Usuario-Nombre': 'Ana%E0%A4%A' },
      /X-Usuario-Nombre/,
    ],
  ])('responde no-autenticado si %s', (_caso, cambios, mensaje) => {
    const { activar } = conSesion({ ...IDENTIDAD_COMPLETA, ...cambios });

    expect(activar).toThrow(NoAutenticado);
    expect(activar).toThrow(mensaje);
  });

  it('responde no-autenticado si falta el header del nombre', () => {
    const sinNombre: Record<string, string> = { ...IDENTIDAD_COMPLETA };
    delete sinNombre['X-Usuario-Nombre'];
    const { activar } = conSesion(sinNombre);

    expect(activar).toThrow(/falta el header X-Usuario-Nombre/);
  });

  it('un token Bearer sin headers no alcanza: el JWT lo valida el gateway', () => {
    const { activar } = conSesion({
      Authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.x.y',
    });

    expect(activar).toThrow(NoAutenticado);
  });
});
