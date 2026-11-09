import { HttpErrorResponse } from '@angular/common/http';
import { BASE_TIPO_ERROR, leerErrorDeApi } from './error-de-api';

const respuesta = (status: number, error: unknown) =>
  new HttpErrorResponse({ status, error, url: 'http://api.prueba/api/identidad/usuarios' });

describe('leerErrorDeApi', () => {
  it('lee el código, el detalle y los errores por campo de un problema RFC 9457', () => {
    const error = leerErrorDeApi(
      respuesta(400, {
        type: `${BASE_TIPO_ERROR}validacion`,
        title: 'Solicitud incorrecta',
        status: 400,
        detail: 'Los datos enviados no tienen la forma esperada.',
        instance: '/api/identidad/usuarios',
        errores: [
          { campo: 'correo', mensaje: 'Es obligatorio y debe ser un texto.' },
          { campo: 3, mensaje: 'sin campo válido' },
        ],
      }),
    );

    expect(error).toEqual({
      estado: 400,
      codigo: 'validacion',
      detalle: 'Los datos enviados no tienen la forma esperada.',
      errores: [{ campo: 'correo', mensaje: 'Es obligatorio y debe ser un texto.' }],
    });
  });

  it('no inventa un código para un type fuera del catálogo, como about:blank', () => {
    const error = leerErrorDeApi(
      respuesta(404, { type: 'about:blank', title: 'No encontrado', status: 404 }),
    );

    expect(error.codigo).toBeUndefined();
    expect(error.detalle).toBe('No encontramos lo que buscas.');
  });

  it('sin respuesta (estado 0) pide revisar la conexión', () => {
    const error = leerErrorDeApi(respuesta(0, new ProgressEvent('error')));

    expect(error.estado).toBe(0);
    expect(error.detalle).toContain('No se pudo conectar con el servidor');
  });

  it('sin un cuerpo RFC 9457 usa un mensaje según el estado', () => {
    expect(leerErrorDeApi(respuesta(503, 'Service Unavailable')).detalle).toContain(
      'no está disponible',
    );
    expect(leerErrorDeApi(respuesta(500, null)).detalle).toContain('error inesperado');
  });

  it('un error que no es HTTP da un mensaje genérico', () => {
    expect(leerErrorDeApi(new Error('falló algo')).detalle).toContain('error inesperado');
  });
});
