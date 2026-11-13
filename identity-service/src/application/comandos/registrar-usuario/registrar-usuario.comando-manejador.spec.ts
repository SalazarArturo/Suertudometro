import { CifradorFalso } from '../../../../test/dobles/cifrador-falso.js';
import { RelojFijo } from '../../../../test/dobles/reloj-fijo.js';
import { RepositorioCuentasUsuarioEnMemoria } from '../../../../test/dobles/repositorio-cuentas-usuario-en-memoria.js';
import { UsuarioCreado } from '../../../domain/cuenta-usuario/eventos/usuario-creado.js';
import { Rol } from '../../../domain/cuenta-usuario/rol.js';
import { ReglaDeNegocioIncumplida } from '../../../sharedkernel/regla-de-negocio.js';
import { RegistrarUsuarioComando } from './registrar-usuario.comando.js';
import { RegistrarUsuarioComandoManejador } from './registrar-usuario.comando-manejador.js';

const CONTRASENA = 'una frase larga y secreta';

describe('RegistrarUsuarioComandoManejador', () => {
  let repositorio: RepositorioCuentasUsuarioEnMemoria;
  let cifrador: CifradorFalso;
  let reloj: RelojFijo;
  let manejador: RegistrarUsuarioComandoManejador;

  beforeEach(() => {
    repositorio = new RepositorioCuentasUsuarioEnMemoria();
    cifrador = new CifradorFalso();
    reloj = new RelojFijo();
    manejador = new RegistrarUsuarioComandoManejador(
      repositorio,
      cifrador,
      reloj,
    );
  });

  const registrar = (
    correo = 'Ana@Example.org',
    nombre = '  Ana Pérez ',
    contrasena = CONTRASENA,
  ) =>
    manejador.execute(new RegistrarUsuarioComando(nombre, correo, contrasena));

  it('registra una cuenta USUARIO y devuelve su vista normalizada', async () => {
    const vista = await registrar();

    expect(vista).toEqual({
      id: expect.stringMatching(/^[0-9a-f-]{36}$/) as string,
      nombre: 'Ana Pérez',
      correo: 'ana@example.org',
      rol: Rol.Usuario,
      registradoEn: reloj.ahora(),
    });
    expect(repositorio.cuentas()).toHaveLength(1);
  });

  it('guarda el hash que calcula el cifrador, no la contraseña en claro (R5)', async () => {
    await registrar();

    const [cuenta] = repositorio.cuentas();
    expect(cuenta.hashContrasena.valor).toBe(
      CifradorFalso.hashDe(CONTRASENA).valor,
    );
    expect(cuenta.hashContrasena.valor).not.toBe(CONTRASENA);
  });

  it('deja UsuarioCreado en el outbox para que salga UsuarioRegistrado', async () => {
    const vista = await registrar();

    expect(repositorio.eventosGuardados).toHaveLength(1);
    const evento = repositorio.eventosGuardados[0] as UsuarioCreado;
    expect(evento).toBeInstanceOf(UsuarioCreado);
    expect(evento.idUsuario.valor).toBe(vista.id);
    expect(evento.correo.valor).toBe('ana@example.org');
  });

  it('rechaza un correo ya registrado, aunque cambien las mayúsculas, sin calcular otro hash (R2)', async () => {
    await registrar('ana@example.org');

    await expect(registrar('ANA@EXAMPLE.ORG')).rejects.toMatchObject({
      codigo: 'correo-ya-registrado',
    });
    expect(cifrador.cifrados).toBe(1);
    expect(repositorio.cuentas()).toHaveLength(1);
  });

  it('si otra cuenta gana la carrera por el correo, propaga correo-ya-registrado (R2)', async () => {
    await registrar('ana@example.org');
    // La consulta previa no la ve, pero el índice UNIQUE (aquí, el doble) sí.
    vi.spyOn(repositorio, 'existeConCorreo').mockResolvedValue(false);

    const error: unknown = await registrar('ana@example.org').catch(
      (e: unknown) => e,
    );

    expect(error).toBeInstanceOf(ReglaDeNegocioIncumplida);
    expect(error).toMatchObject({ codigo: 'correo-ya-registrado' });
  });

  it.each([
    ['un correo inválido', ['ana', 'Ana Pérez', CONTRASENA], 'correo-invalido'],
    [
      'un nombre de 1 carácter',
      ['ana@example.org', 'A', CONTRASENA],
      'nombre-invalido',
    ],
    [
      'una contraseña corta',
      ['ana@example.org', 'Ana Pérez', 'corta'],
      'contrasena-invalida',
    ],
  ] as const)(
    'rechaza %s y no guarda nada',
    async (_caso, [correo, nombre, contrasena], codigo) => {
      await expect(registrar(correo, nombre, contrasena)).rejects.toMatchObject(
        {
          codigo,
        },
      );
      expect(repositorio.cuentas()).toHaveLength(0);
      expect(cifrador.cifrados).toBe(0);
    },
  );
});
