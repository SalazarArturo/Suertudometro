import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FieldTree, form } from '@angular/forms/signals';
import { ErrorDeApi } from './error-de-api';
import { ERROR_DEL_SERVIDOR, erroresDeFormulario } from './errores-de-formulario';

const errorDeApi = (cambios: Partial<ErrorDeApi>): ErrorDeApi => ({
  estado: 400,
  codigo: undefined,
  detalle: 'Detalle del servidor.',
  errores: [],
  ...cambios,
});

describe('erroresDeFormulario', () => {
  let formulario: FieldTree<{ correo: string; contrasena: string }>;

  beforeEach(() => {
    formulario = TestBed.runInInjectionContext(() => form(signal({ correo: '', contrasena: '' })));
  });

  it('pone cada error de un 400 validacion en el campo con su nombre', () => {
    const [error] = erroresDeFormulario(
      errorDeApi({ codigo: 'validacion', errores: [{ campo: 'correo', mensaje: 'Falta.' }] }),
      { correo: formulario.correo },
    );

    expect(error.kind).toBe(ERROR_DEL_SERVIDOR);
    expect(error.message).toBe('Falta.');
    expect(error.fieldTree).toBe(formulario.correo);
  });

  it('deja en el formulario un error de un campo que no tiene, con su nombre', () => {
    const [error] = erroresDeFormulario(
      errorDeApi({ errores: [{ campo: 'rol', mensaje: 'No es un campo permitido.' }] }),
      { correo: formulario.correo },
    );

    expect(error.fieldTree).toBeUndefined();
    expect(error.message).toBe('rol: No es un campo permitido.');
  });

  it('lleva un código conocido a su campo', () => {
    const [error] = erroresDeFormulario(
      errorDeApi({ estado: 409, codigo: 'correo-ya-registrado', detalle: 'Ya existe.' }),
      { correo: formulario.correo },
      { 'correo-ya-registrado': 'correo' },
    );

    expect(error.fieldTree).toBe(formulario.correo);
    expect(error.message).toBe('Ya existe.');
  });

  it('deja lo demás en el formulario, sin campo', () => {
    const errores = erroresDeFormulario(
      errorDeApi({ estado: 401, codigo: 'credenciales-invalidas', detalle: 'No coinciden.' }),
    );

    expect(errores).toEqual([{ kind: ERROR_DEL_SERVIDOR, message: 'No coinciden.' }]);
  });
});
