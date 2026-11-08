import {
  ArgumentsHost,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { ValidationError } from 'class-validator';
import { CredencialesInvalidas } from '../../application/errores/credenciales-invalidas.js';
import { ErrorDeAplicacion } from '../../application/errores/error-de-aplicacion.js';
import { UsuarioNoEncontrado } from '../../application/errores/usuario-no-encontrado.js';
import {
  ReglaDeNegocio,
  ReglaDeNegocioIncumplida,
} from '../../sharedkernel/regla-de-negocio.js';
import { crearErrorDeValidacion } from './error-de-validacion.js';
import { aProblema, FiltroProblemas } from './filtro-problemas.js';

const RUTA = '/api/identidad/usuarios';

const reglaIncumplida = (codigo: string, mensaje = 'Una regla.') =>
  new ReglaDeNegocioIncumplida({
    codigo,
    mensaje,
    seIncumple: () => true,
  } satisfies ReglaDeNegocio);

class ErrorSinCatalogo extends ErrorDeAplicacion {
  constructor() {
    super('error-sin-catalogo', 'Un detalle interno que no debe salir.');
  }
}

describe('aProblema', () => {
  it('una regla de dominio sin estado en el catálogo responde 400 con su código', () => {
    expect(
      aProblema(
        reglaIncumplida('correo-invalido', 'El correo no es válido.'),
        RUTA,
      ),
    ).toEqual({
      type: 'https://api.suertudometro.com/errores/correo-invalido',
      title: 'Solicitud incorrecta',
      status: 400,
      detail: 'El correo no es válido.',
      instance: RUTA,
    });
  });

  it('correo-ya-registrado responde 409 Conflicto', () => {
    expect(
      aProblema(reglaIncumplida('correo-ya-registrado'), RUTA),
    ).toMatchObject({
      type: 'https://api.suertudometro.com/errores/correo-ya-registrado',
      title: 'Conflicto',
      status: 409,
    });
  });

  it.each([
    [new CredencialesInvalidas(), 401, 'credenciales-invalidas'],
    [
      new UsuarioNoEncontrado('e3b68016-9750-41b3-9e34-762dd8346001'),
      404,
      'usuario-no-encontrado',
    ],
  ])('el error de aplicación %s responde %i', (error, estado, codigo) => {
    expect(aProblema(error, RUTA)).toMatchObject({
      type: `https://api.suertudometro.com/errores/${codigo}`,
      status: estado,
      detail: error.message,
    });
  });

  it('un error de aplicación que falta en el catálogo responde 500 sin mostrar su mensaje', () => {
    const problema = aProblema(new ErrorSinCatalogo(), RUTA);

    expect(problema).toMatchObject({ type: 'about:blank', status: 500 });
    expect(problema.detail).not.toContain('interno');
  });

  it('un error inesperado responde 500 sin mostrar su mensaje', () => {
    const problema = aProblema(new Error('connection refused 10.0.0.5'), RUTA);

    expect(problema).toEqual({
      type: 'about:blank',
      title: 'Error interno del servidor',
      status: 500,
      detail: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
      instance: RUTA,
    });
  });

  it('un error HTTP genérico responde about:blank con su estado y su mensaje', () => {
    expect(
      aProblema(
        new NotFoundException('Cannot GET /api/identidad/nada'),
        '/api/identidad/nada',
      ),
    ).toEqual({
      type: 'about:blank',
      title: 'No encontrado',
      status: 404,
      detail: 'Cannot GET /api/identidad/nada',
      instance: '/api/identidad/nada',
    });
  });

  it('une los mensajes de un error HTTP que trae varios', () => {
    expect(
      aProblema(new BadRequestException(['uno', 'dos']), RUTA).detail,
    ).toBe('uno; dos');
  });
});

describe('errores de validación', () => {
  const error = (
    property: string,
    constraints?: Record<string, string>,
    children: ValidationError[] = [],
  ): ValidationError => ({ property, constraints, children });

  it('responden 400 validacion con la lista de campos', () => {
    const problema = aProblema(
      crearErrorDeValidacion([
        error('correo', { isString: 'Es obligatorio y debe ser un texto.' }),
        error('rol', { whitelistValidation: 'property rol should not exist' }),
      ]),
      RUTA,
    );

    expect(problema).toEqual({
      type: 'https://api.suertudometro.com/errores/validacion',
      title: 'Solicitud incorrecta',
      status: 400,
      detail: 'Los datos enviados no tienen la forma esperada.',
      instance: RUTA,
      errores: [
        { campo: 'correo', mensaje: 'Es obligatorio y debe ser un texto.' },
        { campo: 'rol', mensaje: 'No es un campo permitido.' },
      ],
    });
  });

  it('aplanan los campos anidados con su ruta completa', () => {
    const { errores } = crearErrorDeValidacion([
      error('direccion', undefined, [
        error('ciudad', { isString: 'Debe ser un texto.' }),
      ]),
    ]);

    expect(errores).toEqual([
      { campo: 'direccion.ciudad', mensaje: 'Debe ser un texto.' },
    ]);
  });

  it('si el cuerpo entero no es un objeto, el campo es "cuerpo"', () => {
    const { errores } = crearErrorDeValidacion([
      error('', {
        unknownValue: 'an unknown value was passed to the validate function',
      }),
    ]);

    expect(errores).toEqual([
      {
        campo: 'cuerpo',
        mensaje: 'El cuerpo de la petición debe ser un objeto JSON.',
      },
    ]);
  });
});

describe('FiltroProblemas', () => {
  /** Una respuesta de Express mínima que recuerda lo que se le escribe. */
  function crearRespuesta() {
    const respuesta = {
      estado: 0,
      tipo: '',
      cuerpo: undefined as unknown,
      status(estado: number) {
        respuesta.estado = estado;
        return respuesta;
      },
      type(tipo: string) {
        respuesta.tipo = tipo;
        return respuesta;
      },
      json(cuerpo: unknown) {
        respuesta.cuerpo = cuerpo;
        return respuesta;
      },
    };
    return respuesta;
  }

  function crearHost(
    respuesta: ReturnType<typeof crearRespuesta>,
  ): ArgumentsHost {
    const peticion = { method: 'POST', originalUrl: `${RUTA}?origen=prueba` };
    return {
      switchToHttp: () => ({
        getRequest: () => peticion,
        getResponse: () => respuesta,
      }),
    } as unknown as ArgumentsHost;
  }

  it('responde application/problem+json con el estado del error y la ruta sin query', () => {
    const respuesta = crearRespuesta();

    new FiltroProblemas().catch(
      reglaIncumplida('correo-ya-registrado'),
      crearHost(respuesta),
    );

    expect(respuesta.estado).toBe(409);
    expect(respuesta.tipo).toBe('application/problem+json');
    expect(respuesta.cuerpo).toMatchObject({ status: 409, instance: RUTA });
  });

  it('deja en el log los errores 500, y no los 4xx', () => {
    const log = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const filtro = new FiltroProblemas();

    filtro.catch(
      reglaIncumplida('correo-ya-registrado'),
      crearHost(crearRespuesta()),
    );
    expect(log).not.toHaveBeenCalled();

    filtro.catch(new Error('se cayó la base'), crearHost(crearRespuesta()));
    expect(log).toHaveBeenCalledWith(
      `POST ${RUTA}`,
      expect.stringContaining('se cayó la base'),
    );

    log.mockRestore();
  });
});
