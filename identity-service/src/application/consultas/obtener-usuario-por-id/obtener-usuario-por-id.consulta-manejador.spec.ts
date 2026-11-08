import { CifradorFalso } from '../../../../test/dobles/cifrador-falso.js';
import { LectorUsuariosEnMemoria } from '../../../../test/dobles/lector-usuarios-en-memoria.js';
import { RepositorioCuentasUsuarioEnMemoria } from '../../../../test/dobles/repositorio-cuentas-usuario-en-memoria.js';
import { Correo } from '../../../domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../../domain/cuenta-usuario/cuenta-usuario.js';
import { IdUsuario } from '../../../domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../../domain/cuenta-usuario/nombre-usuario.js';
import { Rol } from '../../../domain/cuenta-usuario/rol.js';
import { UsuarioNoEncontrado } from '../../errores/usuario-no-encontrado.js';
import { ObtenerUsuarioPorIdConsulta } from './obtener-usuario-por-id.consulta.js';
import { ObtenerUsuarioPorIdConsultaManejador } from './obtener-usuario-por-id.consulta-manejador.js';

const ID = 'e3b68016-9750-41b3-9e34-762dd8346001';
const REGISTRO = new Date('2026-11-01T10:00:00.000Z');

describe('ObtenerUsuarioPorIdConsultaManejador', () => {
  let manejador: ObtenerUsuarioPorIdConsultaManejador;

  beforeEach(() => {
    const repositorio = new RepositorioCuentasUsuarioEnMemoria();
    repositorio.agregar(
      CuentaUsuario.reconstituir({
        id: IdUsuario.de(ID),
        correo: Correo.de('ana@example.org'),
        nombre: NombreUsuario.de('Ana Pérez'),
        hashContrasena: CifradorFalso.hashDe('una frase larga y secreta'),
        rol: Rol.Usuario,
        registradoEn: REGISTRO,
        ultimoInicioSesionEn: null,
      }),
    );
    manejador = new ObtenerUsuarioPorIdConsultaManejador(
      new LectorUsuariosEnMemoria(repositorio),
    );
  });

  it('devuelve la vista del usuario, sin el hash de la contraseña', async () => {
    const vista = await manejador.execute(new ObtenerUsuarioPorIdConsulta(ID));

    expect(vista).toEqual({
      id: ID,
      nombre: 'Ana Pérez',
      correo: 'ana@example.org',
      rol: Rol.Usuario,
      registradoEn: REGISTRO,
    });
  });

  it('si la cuenta no existe, lanza usuario-no-encontrado', async () => {
    const otroId = '0e903b45-0518-471b-af10-f5706b5409b3';

    const error: unknown = await manejador
      .execute(new ObtenerUsuarioPorIdConsulta(otroId))
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(UsuarioNoEncontrado);
    expect(error).toMatchObject({ codigo: 'usuario-no-encontrado' });
  });

  it('si el id no es un UUID, lanza id-usuario-invalido', async () => {
    await expect(
      manejador.execute(new ObtenerUsuarioPorIdConsulta('no-es-un-uuid')),
    ).rejects.toMatchObject({ codigo: 'id-usuario-invalido' });
  });
});
