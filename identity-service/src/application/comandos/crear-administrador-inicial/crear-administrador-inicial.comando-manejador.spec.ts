import { CifradorFalso } from '../../../../test/dobles/cifrador-falso.js';
import { RelojFijo } from '../../../../test/dobles/reloj-fijo.js';
import { RepositorioCuentasUsuarioEnMemoria } from '../../../../test/dobles/repositorio-cuentas-usuario-en-memoria.js';
import { Correo } from '../../../domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../../domain/cuenta-usuario/cuenta-usuario.js';
import { UsuarioCreado } from '../../../domain/cuenta-usuario/eventos/usuario-creado.js';
import { IdUsuario } from '../../../domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../../domain/cuenta-usuario/nombre-usuario.js';
import { Rol } from '../../../domain/cuenta-usuario/rol.js';
import { CrearAdministradorInicialComando } from './crear-administrador-inicial.comando.js';
import { CrearAdministradorInicialComandoManejador } from './crear-administrador-inicial.comando-manejador.js';

const CORREO = 'admin@suertudometro.local';
const CONTRASENA = 'clave del administrador';

describe('CrearAdministradorInicialComandoManejador', () => {
  let repositorio: RepositorioCuentasUsuarioEnMemoria;
  let cifrador: CifradorFalso;
  let manejador: CrearAdministradorInicialComandoManejador;

  beforeEach(() => {
    repositorio = new RepositorioCuentasUsuarioEnMemoria();
    cifrador = new CifradorFalso();
    manejador = new CrearAdministradorInicialComandoManejador(
      repositorio,
      cifrador,
      new RelojFijo(),
    );
  });

  const sembrar = (contrasena = CONTRASENA) =>
    manejador.execute(
      new CrearAdministradorInicialComando('Administrador', CORREO, contrasena),
    );

  it('crea la cuenta ADMINISTRADOR y deja UsuarioCreado en el outbox', async () => {
    const resultado = await sembrar();

    expect(resultado).toEqual({
      creado: true,
      idUsuario: expect.any(String) as string,
    });
    const [cuenta] = repositorio.cuentas();
    expect(cuenta.rol).toBe(Rol.Administrador);
    expect(cuenta.correo.valor).toBe(CORREO);
    expect(repositorio.eventosGuardados).toHaveLength(1);
    expect((repositorio.eventosGuardados[0] as UsuarioCreado).rol).toBe(
      Rol.Administrador,
    );
  });

  it('es idempotente: la segunda vez no crea nada ni publica otro evento', async () => {
    await sembrar();

    await expect(sembrar()).resolves.toEqual({ creado: false });
    expect(repositorio.cuentas()).toHaveLength(1);
    expect(repositorio.eventosGuardados).toHaveLength(1);
    expect(cifrador.cifrados).toBe(1);
  });

  it('si ya hay una cuenta USUARIO con ese correo, no la convierte en administrador', async () => {
    repositorio.agregar(
      CuentaUsuario.reconstituir({
        id: IdUsuario.nuevo(),
        correo: Correo.de(CORREO),
        nombre: NombreUsuario.de('Alguien'),
        hashContrasena: CifradorFalso.hashDe('otra frase'),
        rol: Rol.Usuario,
        registradoEn: new Date('2026-11-01T10:00:00.000Z'),
        ultimoInicioSesionEn: null,
      }),
    );

    await expect(sembrar()).resolves.toEqual({ creado: false });
    expect(repositorio.cuentas()[0].rol).toBe(Rol.Usuario);
  });

  it('si otra instancia gana la carrera, responde creado: false en vez de fallar', async () => {
    await sembrar();
    vi.spyOn(repositorio, 'existeConCorreo').mockResolvedValue(false);

    await expect(sembrar()).resolves.toEqual({ creado: false });
    expect(repositorio.cuentas()).toHaveLength(1);
  });

  it('con una contraseña que no cumple la política, falla (la configuración está mal)', async () => {
    await expect(sembrar('corta')).rejects.toMatchObject({
      codigo: 'contrasena-invalida',
    });
    expect(repositorio.cuentas()).toHaveLength(0);
  });
});
