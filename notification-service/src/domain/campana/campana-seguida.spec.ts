import { ANA, BETO, CAMPANA, OLGA } from '../../../test/dobles/eventos.js';
import { IdCampana } from '../identificadores/id-campana.js';
import { IdUsuario } from '../identificadores/id-usuario.js';
import { CampanaSeguida } from './campana-seguida.js';

const T1 = new Date('2026-11-24T15:00:00Z');
const T2 = new Date('2026-11-24T16:00:00Z');

const publicar = () =>
  CampanaSeguida.publicar({
    id: IdCampana.de(CAMPANA),
    idOrganizador: IdUsuario.de(OLGA),
    titulo: 'Libros',
    publicadaEn: T1,
  });

describe('CampanaSeguida', () => {
  it('recién publicada, solo tiene a quien la organiza', () => {
    expect(publicar().destinatariosDeNovedades()).toEqual([]);
    expect(
      publicar()
        .destinatariosDelResultado()
        .map((d) => [d.idUsuario.valor, d.papel]),
    ).toEqual([[OLGA, 'ORGANIZADOR']]);
  });

  it('R3: un segundo aporte de la misma persona no repite ni cambia el vínculo', () => {
    const campana = publicar();
    campana.vincularAportante(IdUsuario.de(ANA), T1);
    campana.vincularAportante(IdUsuario.de(ANA), T2);

    expect(campana.aportantes).toEqual([
      { idUsuario: IdUsuario.de(ANA), vinculadoEn: T1 },
    ]);
  });

  it('R4: quien organiza y además aporta no recibe dos avisos ni sus novedades', () => {
    const campana = publicar();
    campana.vincularAportante(IdUsuario.de(OLGA), T1);
    campana.vincularAportante(IdUsuario.de(ANA), T1);
    campana.vincularAportante(IdUsuario.de(BETO), T1);

    expect(campana.destinatariosDeNovedades().map((id) => id.valor)).toEqual([
      ANA,
      BETO,
    ]);
    expect(
      campana
        .destinatariosDelResultado()
        .map((d) => [d.idUsuario.valor, d.papel]),
    ).toEqual([
      [OLGA, 'ORGANIZADOR'],
      [ANA, 'APORTANTE'],
      [BETO, 'APORTANTE'],
    ]);
  });

  it('al reconstituirla conserva sus vínculos', () => {
    const campana = CampanaSeguida.reconstituir(publicar(), [
      { idUsuario: IdUsuario.de(ANA), vinculadoEn: T1 },
    ]);
    expect(campana.destinatariosDeNovedades().map((id) => id.valor)).toEqual([
      ANA,
    ]);
  });
});
