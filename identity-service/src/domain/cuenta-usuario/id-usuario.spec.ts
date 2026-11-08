import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { IdUsuario } from './id-usuario.js';

describe('IdUsuario', () => {
  it('nuevo() genera un UUID distinto cada vez', () => {
    const a = IdUsuario.nuevo();
    const b = IdUsuario.nuevo();

    expect(a.valor).toMatch(/^[0-9a-f-]{36}$/);
    expect(a.esIgualA(b)).toBe(false);
  });

  it('de() acepta un UUID y lo normaliza a minúsculas', () => {
    const id = IdUsuario.de('E3B68016-9750-41B3-9E34-762DD8346001');

    expect(id.valor).toBe('e3b68016-9750-41b3-9e34-762dd8346001');
    expect(
      id.esIgualA(IdUsuario.de('e3b68016-9750-41b3-9e34-762dd8346001')),
    ).toBe(true);
    expect(String(id)).toBe('e3b68016-9750-41b3-9e34-762dd8346001');
  });

  it.each([[''], ['123'], ['e3b68016-9750-41b3-9e34'], ['no-es-un-uuid']])(
    'rechaza "%s"',
    (texto) => {
      expect(capturarError(() => IdUsuario.de(texto))).toMatchObject({
        codigo: 'id-usuario-invalido',
      });
    },
  );
});
