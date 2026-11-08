import { Entorno, validarVariablesEntorno } from './variables-entorno.js';

const URL_BASE = 'postgresql://identity:identity@identity-db:5432/identity';

/** Variables mínimas válidas, más las que cada prueba quiera cambiar. */
const con = (cambios: Record<string, unknown> = {}) => ({
  DATABASE_URL: URL_BASE,
  ...cambios,
});

describe('validarVariablesEntorno', () => {
  it('usa el puerto 8081 y el entorno de desarrollo si no se indican', () => {
    const variables = validarVariablesEntorno(con());

    expect(variables.PUERTO).toBe(8081);
    expect(variables.NODE_ENV).toBe(Entorno.Desarrollo);
    expect(variables.DATABASE_URL).toBe(URL_BASE);
  });

  it('convierte el puerto de texto a número', () => {
    expect(validarVariablesEntorno(con({ PUERTO: '9000' })).PUERTO).toBe(9000);
  });

  it.each([['abc'], ['0'], ['70000']])('rechaza el puerto %s', (puerto) => {
    expect(() => validarVariablesEntorno(con({ PUERTO: puerto }))).toThrow(
      /Variables de entorno inválidas/,
    );
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => validarVariablesEntorno(con({ NODE_ENV: 'staging' }))).toThrow(
      /Variables de entorno inválidas/,
    );
  });

  it('exige DATABASE_URL', () => {
    expect(() => validarVariablesEntorno({})).toThrow(/DATABASE_URL/);
  });

  it.each([['mysql://identity@localhost/identity'], ['identity-db:5432']])(
    'rechaza DATABASE_URL %s, que no es de PostgreSQL',
    (url) => {
      expect(() => validarVariablesEntorno(con({ DATABASE_URL: url }))).toThrow(
        /DATABASE_URL/,
      );
    },
  );

  it('acepta el esquema corto postgres://', () => {
    const url =
      'postgres://identity:identity@localhost:5433/identity?schema=public';
    expect(
      validarVariablesEntorno(con({ DATABASE_URL: url })).DATABASE_URL,
    ).toBe(url);
  });
});
