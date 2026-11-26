import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  FieldTree,
  form,
  required,
  submit,
  TreeValidationResult,
  validate,
  ValidationError,
} from '@angular/forms/signals';
import { envioReintentable } from './envio-reintentable';
import { ERROR_DEL_SERVIDOR } from './errores-de-formulario';

describe('envioReintentable', () => {
  interface Datos {
    correo: string;
    nombre: string;
  }
  const modelo = signal<Datos>({ correo: '', nombre: '' });
  const accion = vi.fn<() => Promise<TreeValidationResult>>();
  let formulario: FieldTree<Datos>;

  const caido: ValidationError = { kind: ERROR_DEL_SERVIDOR, message: 'El servicio no responde.' };
  const mensajes = () =>
    formulario()
      .errors()
      .map(({ message }) => message);

  beforeEach(() => {
    modelo.set({ correo: 'ana@example.org', nombre: 'Ana' });
    accion.mockReset().mockResolvedValue(undefined);
    formulario = TestBed.runInInjectionContext(() =>
      form(
        modelo,
        (campo) => {
          required(campo.correo, { message: 'Escribe tu correo.' });
          validate(campo, ({ value }) =>
            value().nombre === 'Nadie'
              ? { kind: 'nombre', message: 'Elige otro nombre.' }
              : undefined,
          );
        },
        { submission: envioReintentable(modelo, accion) },
      ),
    );
  });

  it('envía si no hay nada que corregir', async () => {
    await submit(formulario);

    expect(accion).toHaveBeenCalledOnce();
  });

  it('no envía si falta un dato, y marca los campos para mostrarlo', async () => {
    modelo.set({ correo: '', nombre: 'Ana' });

    await submit(formulario);

    expect(accion).not.toHaveBeenCalled();
    expect(formulario.correo().touched()).toBe(true);
    expect(formulario.correo().errors()[0].message).toBe('Escribe tu correo.');
  });

  it('después de un error del servidor se puede reenviar sin cambiar nada', async () => {
    accion.mockResolvedValueOnce(caido);
    await submit(formulario);
    expect(mensajes()).toEqual(['El servicio no responde.']);

    await submit(formulario);

    expect(accion).toHaveBeenCalledTimes(2);
    expect(mensajes()).toEqual([]);
    expect(modelo()).toEqual({ correo: 'ana@example.org', nombre: 'Ana' });
  });

  it('mientras reenvía, quita el mensaje del intento anterior', async () => {
    accion.mockResolvedValueOnce(caido);
    await submit(formulario);

    let alEnviar: unknown;
    accion.mockImplementationOnce(() => {
      alEnviar = mensajes();
      return Promise.resolve({ kind: ERROR_DEL_SERVIDOR, message: 'Otro error.' });
    });
    await submit(formulario);

    expect(alEnviar).toEqual([]);
    expect(mensajes()).toEqual(['Otro error.']);
  });

  it('un error del servidor en un campo hay que corregirlo antes de reenviar', async () => {
    accion.mockResolvedValueOnce({
      kind: ERROR_DEL_SERVIDOR,
      message: 'Ya existe una cuenta con ese correo.',
      fieldTree: formulario.correo,
    });
    await submit(formulario);
    await submit(formulario);
    expect(accion).toHaveBeenCalledOnce();

    formulario.correo().value.set('beto@example.org');
    await submit(formulario);
    expect(accion).toHaveBeenCalledTimes(2);
  });

  it('con un error del servidor y un dato que falta, pide el dato', async () => {
    accion.mockResolvedValueOnce(caido);
    await submit(formulario);

    formulario.correo().value.set('');
    await submit(formulario);

    expect(accion).toHaveBeenCalledOnce();
  });

  it('una regla de todo el formulario también hay que cumplirla', async () => {
    modelo.set({ correo: 'ana@example.org', nombre: 'Nadie' });

    await submit(formulario);

    expect(accion).not.toHaveBeenCalled();
  });

  it('mientras envía, otro envío no hace nada', async () => {
    let terminar: (resultado: undefined) => void = () => undefined;
    accion.mockReturnValueOnce(new Promise((resolver) => (terminar = resolver)));

    const primero = submit(formulario);
    await submit(formulario);
    terminar(undefined);
    await primero;

    expect(accion).toHaveBeenCalledOnce();
  });
});
