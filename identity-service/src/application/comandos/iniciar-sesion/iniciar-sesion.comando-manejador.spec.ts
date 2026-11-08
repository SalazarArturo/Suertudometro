import { CifradorFalso } from '../../../../test/dobles/cifrador-falso.js';
import { EmisorTokensFalso } from '../../../../test/dobles/emisor-tokens-falso.js';
import { RelojFijo } from '../../../../test/dobles/reloj-fijo.js';
import { RepositorioCuentasUsuarioEnMemoria } from '../../../../test/dobles/repositorio-cuentas-usuario-en-memoria.js';
import { Correo } from '../../../domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../../domain/cuenta-usuario/cuenta-usuario.js';
import { SesionIniciada } from '../../../domain/cuenta-usuario/eventos/sesion-iniciada.js';
import { IdUsuario } from '../../../domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../../domain/cuenta-usuario/nombre-usuario.js';
import { Rol } from '../../../domain/cuenta-usuario/rol.js';
import { CredencialesInvalidas } from '../../errores/credenciales-invalidas.js';
import { IniciarSesionComando } from './iniciar-sesion.comando.js';
import { IniciarSesionComandoManejador } from './iniciar-sesion.comando-manejador.js';

const ID = 'e3b68016-9750-41b3-9e34-762dd8346001';
const CONTRASENA = 'una frase larga y secreta';

describe('IniciarSesionComandoManejador', () => {
  let repositorio: RepositorioCuentasUsuarioEnMemoria;
  let cifrador: CifradorFalso;
  let emisor: EmisorTokensFalso;
  let reloj: RelojFijo;
  let manejador: IniciarSesionComandoManejador;

  beforeEach(() => {
    repositorio = new RepositorioCuentasUsuarioEnMemoria();
    cifrador = new CifradorFalso();
    emisor = new EmisorTokensFalso();
    reloj = new RelojFijo();
    manejador = new IniciarSesionComandoManejador(
      repositorio,
      cifrador,
      emisor,
      reloj,
    );
    repositorio.agregar(
      CuentaUsuario.reconstituir({
        id: IdUsuario.de(ID),
        correo: Correo.de('ana@example.org'),
        nombre: NombreUsuario.de('Ana Pérez'),
        hashContrasena: CifradorFalso.hashDe(CONTRASENA),
        rol: Rol.Usuario,
        registradoEn: new Date('2026-11-01T10:00:00.000Z'),
        ultimoInicioSesionEn: null,
      }),
    );
    reloj.avanzarMinutos(30);
  });

  const iniciarSesion = (correo: string, contrasena: string) =>
    manejador.execute(new IniciarSesionComando(correo, contrasena));

  it('devuelve el token y los datos del usuario', async () => {
    const resultado = await iniciarSesion('ana@example.org', CONTRASENA);

    expect(resultado).toEqual({
      tokenAcceso: `token-falso-${ID}`,
      tipoToken: 'Bearer',
      expiraEn: EmisorTokensFalso.EXPIRA_EN,
      usuario: {
        id: ID,
        nombre: 'Ana Pérez',
        correo: 'ana@example.org',
        rol: Rol.Usuario,
      },
    });
  });

  it('pide el token con los claims de la cuenta (§5.1)', async () => {
    await iniciarSesion('ana@example.org', CONTRASENA);

    expect(emisor.emitidos).toEqual([
      {
        idUsuario: ID,
        correo: 'ana@example.org',
        nombre: 'Ana Pérez',
        rol: Rol.Usuario,
      },
    ]);
  });

  it('anota el inicio de sesión y deja SesionIniciada', async () => {
    await iniciarSesion('ana@example.org', CONTRASENA);

    expect(repositorio.porId(IdUsuario.de(ID))?.ultimoInicioSesionEn).toEqual(
      reloj.ahora(),
    );
    expect(repositorio.eventosGuardados).toHaveLength(1);
    expect(repositorio.eventosGuardados[0]).toBeInstanceOf(SesionIniciada);
  });

  it('acepta el correo con otras mayúsculas y espacios', async () => {
    await expect(
      iniciarSesion('  ANA@Example.org ', CONTRASENA),
    ).resolves.toMatchObject({ usuario: { id: ID } });
  });

  describe('R7: no revela qué correos existen', () => {
    it('con un correo inexistente responde credenciales-invalidas y calcula un hash de relleno', async () => {
      await expect(
        iniciarSesion('nadie@example.org', CONTRASENA),
      ).rejects.toBeInstanceOf(CredencialesInvalidas);
      expect(cifrador.verificacionesSimuladas).toBe(1);
      expect(emisor.emitidos).toHaveLength(0);
    });

    it('con una contraseña incorrecta responde credenciales-invalidas y no anota nada', async () => {
      await expect(
        iniciarSesion('ana@example.org', 'otra frase cualquiera'),
      ).rejects.toBeInstanceOf(CredencialesInvalidas);
      expect(
        repositorio.porId(IdUsuario.de(ID))?.ultimoInicioSesionEn,
      ).toBeNull();
      expect(repositorio.eventosGuardados).toHaveLength(0);
      expect(emisor.emitidos).toHaveLength(0);
    });

    it('los dos errores son idénticos (código y mensaje)', async () => {
      const sinCuenta: unknown = await iniciarSesion(
        'nadie@example.org',
        CONTRASENA,
      ).catch((e: unknown) => e);
      const contrasenaMala: unknown = await iniciarSesion(
        'ana@example.org',
        'otra frase cualquiera',
      ).catch((e: unknown) => e);

      expect(sinCuenta).toEqual(contrasenaMala);
      expect(sinCuenta).toMatchObject({ codigo: 'credenciales-invalidas' });
    });
  });

  it('un correo mal formado es un error de validación, no de credenciales', async () => {
    await expect(iniciarSesion('ana', CONTRASENA)).rejects.toMatchObject({
      codigo: 'correo-invalido',
    });
  });
});
