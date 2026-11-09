import { rutaDeRetorno } from './ruta-de-retorno';

describe('rutaDeRetorno', () => {
  it.each([['/perfil'], ['/campanas/9b1deb4d?pestana=aportes'], ['/']])(
    'acepta la ruta interna %s',
    (ruta) => {
      expect(rutaDeRetorno(ruta)).toBe(ruta);
    },
  );

  it.each([
    [undefined],
    [''],
    ['perfil'],
    ['https://sitio-falso.com'],
    ['//sitio-falso.com'],
    ['/\\sitio-falso.com'],
  ])('cambia %s por el inicio', (ruta) => {
    expect(rutaDeRetorno(ruta)).toBe('/');
  });
});
