import { Entorno, validarVariablesEntorno } from './variables-entorno.js';

const URL_BASE = 'postgresql://identity:identity@identity-db:5432/identity';
const SECRETO = 'un-secreto-de-prueba-de-al-menos-32-bytes';

/** Variables mínimas válidas, más las que cada prueba quiera cambiar. */
const con = (cambios: Record<string, unknown> = {}) => ({
  DATABASE_URL: URL_BASE,
  JWT_SECRETO: SECRETO,
  ADMIN_CORREO: 'admin@suertudometro.local',
  ADMIN_CONTRASENA: 'clave del administrador',
  ...cambios,
});

/** Las variables mínimas sin la indicada. */
const sin = (nombre: string) => {
  const variables: Record<string, unknown> = con();
  delete variables[nombre];
  return variables;
};

describe('validarVariablesEntorno', () => {
  it('usa los valores por defecto si no se indican', () => {
    const variables = validarVariablesEntorno(con());

    expect(variables.PUERTO).toBe(8081);
    expect(variables.NODE_ENV).toBe(Entorno.Desarrollo);
    expect(variables.JWT_DURACION).toBe(3600);
    expect(variables.DATABASE_URL).toBe(URL_BASE);
    expect(variables.JWT_SECRETO).toBe(SECRETO);
  });

  it.each([
    ['DATABASE_URL'],
    ['JWT_SECRETO'],
    ['ADMIN_CORREO'],
    ['ADMIN_CONTRASENA'],
  ])('exige %s', (nombre) => {
    expect(() => validarVariablesEntorno(sin(nombre))).toThrow(
      new RegExp(nombre),
    );
  });

  it('rechaza un JWT_SECRETO de menos de 32 bytes', () => {
    expect(() =>
      validarVariablesEntorno(con({ JWT_SECRETO: 'corto' })),
    ).toThrow(/JWT_SECRETO debe tener al menos 32 bytes/);
  });

  it('cuenta los bytes del secreto, no los caracteres', () => {
    // 16 eñes son 16 caracteres, pero 32 bytes en UTF-8.
    expect(
      validarVariablesEntorno(con({ JWT_SECRETO: 'ñ'.repeat(16) })).JWT_SECRETO,
    ).toHaveLength(16);
  });

  it('convierte JWT_DURACION de texto a número', () => {
    expect(
      validarVariablesEntorno(con({ JWT_DURACION: '900' })).JWT_DURACION,
    ).toBe(900);
  });

  it.each([['30'], ['100000'], ['una hora']])(
    'rechaza JWT_DURACION %s',
    (duracion) => {
      expect(() =>
        validarVariablesEntorno(con({ JWT_DURACION: duracion })),
      ).toThrow(/JWT_DURACION/);
    },
  );

  it('rechaza un ADMIN_CORREO vacío', () => {
    expect(() => validarVariablesEntorno(con({ ADMIN_CORREO: '' }))).toThrow(
      /ADMIN_CORREO es obligatoria/,
    );
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
