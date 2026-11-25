import { esFaltaDeServidor } from './enviador-smtp.js';

const error = (code: unknown) => Object.assign(new Error('fallo'), { code });

describe('esFaltaDeServidor', () => {
  it.each(['ECONNREFUSED', 'ETIMEDOUT', 'ESOCKET', 'EDNS', 'ECONNECTION'])(
    '%s es falta de servidor',
    (codigo) => {
      expect(esFaltaDeServidor(error(codigo))).toBe(true);
    },
  );

  it.each([
    ['un destinatario rechazado', error('EENVELOPE')],
    ['un mensaje rechazado', error('EMESSAGE')],
    ['un error sin código', new Error('fallo')],
    ['algo que no es un error', 'ECONNREFUSED'],
    ['null', null],
  ])('%s no lo es', (_, valor) => {
    expect(esFaltaDeServidor(valor)).toBe(false);
  });
});
