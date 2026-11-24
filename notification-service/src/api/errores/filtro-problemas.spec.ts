import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AvisoNoEncontrado } from '../../application/errores/aviso-no-encontrado.js';
import { ServidorDeCorreoNoDisponible } from '../../application/errores/servidor-de-correo-no-disponible.js';
import {
  ReglaDeNegocio,
  ReglaDeNegocioIncumplida,
} from '../../sharedkernel/regla-de-negocio.js';
import { NoAutenticado } from './error-de-api.js';
import { crearErrorDeValidacion } from './error-de-validacion.js';
import { aProblema, FiltroProblemas } from './filtro-problemas.js';

const RUTA = '/api/notificaciones/avisos';

const reglaIncumplida = (codigo: string, mensaje: string) =>
  new ReglaDeNegocioIncumplida({
    codigo,
    mensaje,
    seIncumple: () => true,
  } satisfies ReglaDeNegocio);

describe('aProblema', () => {
  it('una regla de dominio responde 400 con su código', () => {
    expect(
      aProblema(reglaIncumplida('id-aviso-invalido', 'No es un UUID.'), RUTA),
    ).toEqual({
      type: 'https://api.suertudometro.com/errores/id-aviso-invalido',
      title: 'Solicitud incorrecta',
      status: 400,
      detail: 'No es un UUID.',
      instance: RUTA,
    });
  });

  it('aviso-no-encontrado responde 404', () => {
    expect(aProblema(new AvisoNoEncontrado('x'), RUTA)).toMatchObject({
      type: 'https://api.suertudometro.com/errores/aviso-no-encontrado',
      status: 404,
    });
  });

  it('un error de aplicación sin catálogo responde 500 sin contar el detalle', () => {
    const problema = aProblema(
      new ServidorDeCorreoNoDisponible('10.0.0.1'),
      RUTA,
    );
    expect(problema.status).toBe(500);
    expect(JSON.stringify(problema)).not.toContain('10.0.0.1');
  });

  it('un error de validación lista los campos', () => {
    const error = crearErrorDeValidacion([
      { property: 'tamano', constraints: { max: 'No puede pasar de 100.' } },
    ]);
    expect(aProblema(error, RUTA)).toMatchObject({
      status: 400,
      errores: [{ campo: 'tamano', mensaje: 'No puede pasar de 100.' }],
    });
  });

  it('sin identidad responde 401', () => {
    expect(aProblema(new NoAutenticado('falta el token.'), RUTA)).toMatchObject(
      {
        type: 'https://api.suertudometro.com/errores/no-autenticado',
        status: 401,
      },
    );
  });

  it.each([
    [new NotFoundException('Cannot GET /x'), 404],
    [new BadRequestException(['a', 'b']), 400],
  ])('un error HTTP genérico responde about:blank', (error, status) => {
    expect(aProblema(error, RUTA)).toMatchObject({
      type: 'about:blank',
      status,
    });
  });
});

describe('FiltroProblemas', () => {
  it('responde application/problem+json, sin la query, y anota los 500', () => {
    const registro = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => {});
    const json = vi.fn();
    const respuesta = {
      status: vi.fn().mockReturnThis(),
      type: vi.fn().mockReturnThis(),
      json,
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => ({ method: 'GET', originalUrl: `${RUTA}?pagina=1` }),
        getResponse: () => respuesta,
      }),
    } as unknown as ArgumentsHost;

    new FiltroProblemas().catch(new Error('interno'), host);

    expect(respuesta.status).toHaveBeenCalledWith(500);
    expect(respuesta.type).toHaveBeenCalledWith('application/problem+json');
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ instance: RUTA }),
    );
    expect(registro).toHaveBeenCalledTimes(1);
    registro.mockRestore();
  });
});
