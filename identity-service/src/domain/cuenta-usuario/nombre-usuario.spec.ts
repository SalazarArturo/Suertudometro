import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { NombreUsuario } from './nombre-usuario.js';

describe('NombreUsuario (R3)', () => {
  it('quita los espacios de los extremos y conserva tildes y ñ', () => {
    expect(NombreUsuario.de('  Begoña Pérez  ').valor).toBe('Begoña Pérez');
  });

  it.each([['Al'], ['x'.repeat(100)], ['Ñu']])('acepta "%s"', (texto) => {
    expect(NombreUsuario.de(texto).valor).toBe(texto);
  });

  it.each([[''], ['   '], ['A'], ['  A  '], ['x'.repeat(101)]])(
    'rechaza "%s"',
    (texto) => {
      expect(capturarError(() => NombreUsuario.de(texto))).toMatchObject({
        codigo: 'nombre-invalido',
      });
    },
  );
});
