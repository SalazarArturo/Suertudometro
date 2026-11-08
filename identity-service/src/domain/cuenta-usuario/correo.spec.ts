import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { ReglaDeNegocioIncumplida } from '../../sharedkernel/regla-de-negocio.js';
import { Correo } from './correo.js';

describe('Correo (R1)', () => {
  it('se normaliza: sin espacios alrededor y en minúsculas', () => {
    expect(Correo.de('  Ana.Perez@Example.ORG ').valor).toBe(
      'ana.perez@example.org',
    );
  });

  it('dos correos que solo difieren en mayúsculas son el mismo', () => {
    expect(
      Correo.de('ANA@example.org').esIgualA(Correo.de('ana@example.org')),
    ).toBe(true);
  });

  it.each([
    [''],
    ['ana'],
    ['ana@'],
    ['@example.org'],
    ['ana@example'],
    ['ana perez@example.org'],
    ['ana@@example.org'],
  ])('rechaza "%s"', (texto) => {
    const error = capturarError(() => Correo.de(texto));

    expect(error).toBeInstanceOf(ReglaDeNegocioIncumplida);
    expect(error).toMatchObject({ codigo: 'correo-invalido' });
  });

  it('acepta hasta 254 caracteres y rechaza 255', () => {
    const dominio = '@example.org';
    const con254 = 'a'.repeat(254 - dominio.length) + dominio;

    expect(Correo.de(con254).valor).toHaveLength(254);
    expect(capturarError(() => Correo.de('a' + con254))).toMatchObject({
      codigo: 'correo-invalido',
    });
  });
});
