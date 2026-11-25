import { capturarError } from '../../../test/ayudas/capturar-error.js';
import { IdAviso } from './id-aviso.js';
import { IdCampana } from './id-campana.js';
import { IdUsuario } from './id-usuario.js';

const UUID = 'e3b68016-9750-41b3-9e34-762dd8346001';

describe('Identificadores', () => {
  it('se normalizan, y dos con el mismo valor son iguales', () => {
    const id = IdUsuario.de(`  ${UUID.toUpperCase()} `);
    expect(id.valor).toBe(UUID);
    expect(String(id)).toBe(UUID);
    expect(id.esIgualA(IdUsuario.de(UUID))).toBe(true);
  });

  it('un id de usuario no es igual a uno de campaña con el mismo valor', () => {
    expect(IdUsuario.de(UUID).esIgualA(IdCampana.de(UUID))).toBe(false);
  });

  it('un aviso nuevo tiene un id propio', () => {
    expect(IdAviso.nuevo().esIgualA(IdAviso.nuevo())).toBe(false);
  });

  it.each([
    ['id-usuario-invalido', () => IdUsuario.de('no-es-un-uuid')],
    ['id-campana-invalido', () => IdCampana.de('')],
    ['id-aviso-invalido', () => IdAviso.de(`${UUID}0`)],
  ])('sin un UUID da %s', (codigo, crear) => {
    expect(capturarError(crear)).toMatchObject({ codigo });
  });
});
