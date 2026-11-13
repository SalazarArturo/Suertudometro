import { inspect } from 'node:util';
import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { HashContrasena } from './hash-contrasena.js';

const HASH = '$argon2id$v=19$m=19456,t=2,p=1$c2FsdA$aGFzaA';

describe('HashContrasena (R5)', () => {
  it('conserva el hash para el cifrador y la persistencia', () => {
    expect(HashContrasena.de(HASH).valor).toBe(HASH);
  });

  it.each([[''], ['   ']])('rechaza un hash vacío ("%s")', (texto) => {
    expect(capturarError(() => HashContrasena.de(texto))).toMatchObject({
      codigo: 'hash-contrasena-vacio',
    });
  });

  it('no muestra el hash al convertirlo a texto, a JSON ni al inspeccionarlo', () => {
    const hash = HashContrasena.de(HASH);

    expect(String(hash)).not.toContain(HASH);
    expect(JSON.stringify({ hash })).not.toContain(HASH);
    expect(inspect({ hash }, { depth: 5 })).not.toContain(HASH);
  });
});
