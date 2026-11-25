import { capturarError } from '../../test/ayudas/capturar-error.js';
import { Dinero } from './dinero.js';

describe('Dinero', () => {
  it.each([
    ['150.00', 'BOB', 'Bs 150,00'],
    ['0.50', 'BOB', 'Bs 0,50'],
    ['1250.50', 'BOB', 'Bs 1.250,50'],
    ['9999999999.99', 'BOB', 'Bs 9.999.999.999,99'],
    ['0001250.00', 'BOB', 'Bs 1.250,00'],
    ['20.00', 'USD', 'USD 20,00'],
  ])('%s %s se muestra como %s', (monto, moneda, esperado) => {
    expect(Dinero.de(monto, moneda).paraMostrar()).toBe(esperado);
  });

  it.each([
    ['150', 'BOB'],
    ['150.0', 'BOB'],
    ['150,00', 'BOB'],
    ['-1.00', 'BOB'],
    ['1e3.00', 'BOB'],
    ['', 'BOB'],
    ['150.00', 'bob'],
    ['150.00', 'Bs'],
  ])('no acepta %s %s', (monto, moneda) => {
    expect(capturarError(() => Dinero.de(monto, moneda))).toMatchObject({
      codigo: 'dinero-invalido',
    });
  });

  it('se compara por su monto y su moneda', () => {
    expect(Dinero.de('1.00', 'BOB').esIgualA(Dinero.de('1.00', 'BOB'))).toBe(
      true,
    );
    expect(Dinero.de('1.00', 'BOB').esIgualA(Dinero.de('1.00', 'USD'))).toBe(
      false,
    );
  });
});
