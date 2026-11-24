import { validarVariablesEntorno } from './variables-entorno.js';

const MINIMAS = { DATABASE_URL: 'postgresql://u:c@localhost:5432/n' };

describe('validarVariablesEntorno', () => {
  it('solo exige la base: lo demás es opcional o tiene un valor por defecto', () => {
    expect(validarVariablesEntorno(MINIMAS)).toMatchObject({
      PUERTO: 8086,
      SMTP_PUERTO: 1025,
      SMTP_REMITENTE: 'Suertudómetro <avisos@suertudometro.local>',
      URL_FRONTEND: 'http://localhost:4200',
      CORREO_INTERVALO_MS: 2000,
    });
    expect(validarVariablesEntorno(MINIMAS).SMTP_HOST).toBeUndefined();
    expect(validarVariablesEntorno(MINIMAS).RABBITMQ_URL).toBeUndefined();
  });

  it('convierte los números que llegan como texto', () => {
    expect(
      validarVariablesEntorno({
        ...MINIMAS,
        PUERTO: '9000',
        SMTP_PUERTO: '2525',
      }),
    ).toMatchObject({ PUERTO: 9000, SMTP_PUERTO: 2525 });
  });

  it.each([
    ['DATABASE_URL', ''],
    ['DATABASE_URL', 'mysql://x'],
    ['RABBITMQ_URL', 'http://rabbitmq'],
    ['SMTP_HOST', ''],
    ['SMTP_PUERTO', '0'],
    ['SMTP_PUERTO', 'x'],
    ['URL_FRONTEND', 'localhost:4200'],
    ['URL_FRONTEND', 'javascript:alert(1)'],
    ['CORREO_INTERVALO_MS', '50'],
    ['PUERTO', '70000'],
  ])('no arranca con %s=%j', (variable, valor) => {
    expect(() =>
      validarVariablesEntorno({ ...MINIMAS, [variable]: valor }),
    ).toThrow(variable);
  });

  it('no arranca sin DATABASE_URL', () => {
    expect(() => validarVariablesEntorno({})).toThrow('DATABASE_URL');
  });
});
