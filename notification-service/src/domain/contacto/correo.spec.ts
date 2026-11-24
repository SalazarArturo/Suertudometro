import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { Correo } from './correo.js';

describe('Correo', () => {
  it('se guarda sin espacios alrededor y en minúsculas', () => {
    expect(Correo.de('  Ana@Example.ORG ').valor).toBe('ana@example.org');
  });

  it.each([
    'ana',
    'ana@',
    '@example.org',
    'ana@example',
    'ana perez@example.org',
    'ana@example.org\nbcc: otra@example.org',
    `${'a'.repeat(250)}@example.org`,
  ])('no acepta %j', (texto) => {
    expect(capturarError(() => Correo.de(texto))).toMatchObject({
      codigo: 'correo-invalido',
    });
  });
});
