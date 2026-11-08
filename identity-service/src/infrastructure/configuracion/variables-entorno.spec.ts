import { Entorno, validarVariablesEntorno } from './variables-entorno.js';

describe('validarVariablesEntorno', () => {
  it('usa el puerto 8081 y el entorno de desarrollo si no se indican', () => {
    const variables = validarVariablesEntorno({});

    expect(variables.PUERTO).toBe(8081);
    expect(variables.NODE_ENV).toBe(Entorno.Desarrollo);
  });

  it('convierte el puerto de texto a número', () => {
    expect(validarVariablesEntorno({ PUERTO: '9000' }).PUERTO).toBe(9000);
  });

  it.each([['abc'], ['0'], ['70000']])('rechaza el puerto %s', (puerto) => {
    expect(() => validarVariablesEntorno({ PUERTO: puerto })).toThrow(
      /Variables de entorno inválidas/,
    );
  });

  it('rechaza un NODE_ENV desconocido', () => {
    expect(() => validarVariablesEntorno({ NODE_ENV: 'staging' })).toThrow(
      /Variables de entorno inválidas/,
    );
  });
});
