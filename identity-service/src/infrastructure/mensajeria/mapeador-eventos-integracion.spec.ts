import { Correo } from '../../domain/cuenta-usuario/correo.js';
import { SesionIniciada } from '../../domain/cuenta-usuario/eventos/sesion-iniciada.js';
import { UsuarioCreado } from '../../domain/cuenta-usuario/eventos/usuario-creado.js';
import { IdUsuario } from '../../domain/cuenta-usuario/id-usuario.js';
import { Rol } from '../../domain/cuenta-usuario/rol.js';
import { aEventoIntegracion } from './mapeador-eventos-integracion.js';

const ID = 'e3b68016-9750-41b3-9e34-762dd8346001';
const INSTANTE = new Date('2026-11-07T14:00:00.000Z');

describe('aEventoIntegracion', () => {
  it('UsuarioCreado sale como UsuarioRegistrado con el envelope de §5.5', () => {
    const evento = new UsuarioCreado(
      IdUsuario.de(ID),
      Correo.de('ana@example.org'),
      Rol.Usuario,
      INSTANTE,
    );

    expect(aEventoIntegracion(evento)).toEqual({
      idEvento: evento.idEvento,
      tipoEvento: 'usuario.registrado',
      version: 1,
      ocurridoEn: '2026-11-07T14:00:00.000Z',
      datos: { idUsuario: ID, correo: 'ana@example.org' },
    });
  });

  it('datos lleva solo los campos de la ficha: idUsuario y correo (no el rol)', () => {
    const evento = new UsuarioCreado(
      IdUsuario.de(ID),
      Correo.de('admin@example.org'),
      Rol.Administrador,
      INSTANTE,
    );

    expect(Object.keys(aEventoIntegracion(evento)?.datos ?? {})).toEqual([
      'idUsuario',
      'correo',
    ]);
  });

  it('SesionIniciada no sale del servicio', () => {
    expect(
      aEventoIntegracion(new SesionIniciada(IdUsuario.de(ID), INSTANTE)),
    ).toBeNull();
  });
});
