import { inject } from 'vitest';
import { ejecutarPrisma } from '../base-datos/prisma-cli.js';

describe('Migraciones de identity-db', () => {
  it('dejan la base exactamente igual que prisma/schema.prisma (sin diferencias)', () => {
    // --exit-code: 0 si no hay diferencias, 2 si las hay. execFileSync lanza
    // un error si el código no es 0, y el error trae el SQL que faltaría.
    expect(() =>
      ejecutarPrisma(
        [
          'migrate',
          'diff',
          '--from-config-datasource',
          '--to-schema',
          'prisma/schema.prisma',
          '--exit-code',
        ],
        inject('urlBaseDatos'),
      ),
    ).not.toThrow();
  });
});
