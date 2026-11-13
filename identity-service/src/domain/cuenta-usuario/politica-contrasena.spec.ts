import { inspect } from 'node:util';
import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { PoliticaContrasena } from './politica-contrasena.js';

describe('PoliticaContrasena (R4)', () => {
  it.each([
    ['8 caracteres', '12345678'],
    ['128 caracteres', 'x'.repeat(128)],
    ['una frase con espacios', 'una frase larga y secreta'],
    ['solo letras, sin símbolos', 'abcdefgh'],
  ])('acepta %s', (_caso, contrasena) => {
    expect(() => PoliticaContrasena.verificar(contrasena)).not.toThrow();
  });

  it.each([
    ['vacía', ''],
    ['7 caracteres', '1234567'],
    ['129 caracteres', 'x'.repeat(129)],
  ])('rechaza una contraseña %s', (_caso, contrasena) => {
    expect(
      capturarError(() => PoliticaContrasena.verificar(contrasena)),
    ).toMatchObject({ codigo: 'contrasena-invalida' });
  });

  it('cuenta un emoji como un solo carácter', () => {
    // 7 letras + 1 emoji = 8 caracteres, aunque en UTF-16 ocupe 9 unidades.
    expect(() => PoliticaContrasena.verificar('abcdefg🔒')).not.toThrow();
    expect(
      capturarError(() => PoliticaContrasena.verificar('abcdef🔒')),
    ).toMatchObject({ codigo: 'contrasena-invalida' });
  });

  it('el error no guarda la contraseña (puede terminar en un log)', () => {
    const contrasena = 'corta1';

    const error = capturarError(() => PoliticaContrasena.verificar(contrasena));

    expect(inspect(error, { depth: 10 })).not.toContain(contrasena);
    expect(JSON.stringify(error)).not.toContain(contrasena);
  });
});
