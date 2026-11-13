import { Correo } from '../../../src/domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../../src/domain/cuenta-usuario/cuenta-usuario.js';
import { HashContrasena } from '../../../src/domain/cuenta-usuario/hash-contrasena.js';
import { IdUsuario } from '../../../src/domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../../src/domain/cuenta-usuario/nombre-usuario.js';
import { Rol } from '../../../src/domain/cuenta-usuario/rol.js';
import { PrismaServicio } from '../../../src/infrastructure/persistencia/prisma.servicio.js';
import { RepositorioCuentasUsuarioPrisma } from '../../../src/infrastructure/persistencia/repositorio-cuentas-usuario.prisma.js';
import { ReglaDeNegocioIncumplida } from '../../../src/sharedkernel/regla-de-negocio.js';
import { crearPrisma, vaciarTablas } from '../../base-datos/base-datos.js';

const HASH = '$argon2id$v=19$m=65536,t=3,p=4$c2FsdA$aGFzaA';
const REGISTRO = new Date('2026-11-07T14:00:00.123Z');

function nuevaCuenta(correo = 'ana@example.org'): CuentaUsuario {
  return CuentaUsuario.registrar({
    id: IdUsuario.nuevo(),
    correo: Correo.de(correo),
    nombre: NombreUsuario.de('Begoña Pérez'),
    hashContrasena: HashContrasena.de(HASH),
    ahora: REGISTRO,
  });
}

describe('RepositorioCuentasUsuarioPrisma (PostgreSQL)', () => {
  let prisma: PrismaServicio;
  let repositorio: RepositorioCuentasUsuarioPrisma;

  beforeAll(() => {
    prisma = crearPrisma();
    repositorio = new RepositorioCuentasUsuarioPrisma(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas(prisma);
  });

  it('guarda una cuenta y la recupera por correo con todos sus datos', async () => {
    const cuenta = nuevaCuenta();

    await repositorio.guardar(cuenta);
    const recuperada = await repositorio.buscarPorCorreo(
      Correo.de('ANA@example.org'),
    );

    expect(recuperada).not.toBeNull();
    expect(recuperada?.id.esIgualA(cuenta.id)).toBe(true);
    expect(recuperada?.correo.valor).toBe('ana@example.org');
    expect(recuperada?.nombre.valor).toBe('Begoña Pérez');
    expect(recuperada?.hashContrasena.valor).toBe(HASH);
    expect(recuperada?.rol).toBe(Rol.Usuario);
    expect(recuperada?.registradoEn).toEqual(REGISTRO);
    expect(recuperada?.ultimoInicioSesionEn).toBeNull();
    expect(recuperada?.eventosPendientes).toHaveLength(0);
  });

  it('buscarPorCorreo devuelve null y existeConCorreo false si no hay cuenta', async () => {
    const correo = Correo.de('nadie@example.org');

    await expect(repositorio.buscarPorCorreo(correo)).resolves.toBeNull();
    await expect(repositorio.existeConCorreo(correo)).resolves.toBe(false);
  });

  it('existeConCorreo es true después de guardar', async () => {
    await repositorio.guardar(nuevaCuenta());

    await expect(
      repositorio.existeConCorreo(Correo.de('ana@example.org')),
    ).resolves.toBe(true);
  });

  it('guarda el rol ADMINISTRADOR de la siembra', async () => {
    const admin = CuentaUsuario.registrarAdministrador({
      id: IdUsuario.nuevo(),
      correo: Correo.de('admin@example.org'),
      nombre: NombreUsuario.de('Administrador'),
      hashContrasena: HashContrasena.de(HASH),
      ahora: REGISTRO,
    });

    await repositorio.guardar(admin);

    const recuperada = await repositorio.buscarPorCorreo(admin.correo);
    expect(recuperada?.rol).toBe(Rol.Administrador);
  });

  describe('outbox (eventos_salida)', () => {
    it('al registrar, deja UsuarioRegistrado pendiente en la misma transacción', async () => {
      const cuenta = nuevaCuenta();
      const idEvento = cuenta.eventosPendientes[0].idEvento;

      await repositorio.guardar(cuenta);

      const filas = await prisma.eventoSalidaFila.findMany();
      expect(filas).toHaveLength(1);
      expect(filas[0]).toMatchObject({
        idEvento,
        tipoEvento: 'usuario.registrado',
        version: 1,
        ocurridoEn: REGISTRO,
        publicadoEn: null,
        intentos: 0,
        ultimoError: null,
      });
      expect(filas[0].contenido).toEqual({
        idEvento,
        tipoEvento: 'usuario.registrado',
        version: 1,
        ocurridoEn: '2026-11-07T14:00:00.123Z',
        datos: { idUsuario: cuenta.id.valor, correo: 'ana@example.org' },
      });
    });

    it('después de guardar, la cuenta queda sin eventos pendientes', async () => {
      const cuenta = nuevaCuenta();

      await repositorio.guardar(cuenta);

      expect(cuenta.eventosPendientes).toHaveLength(0);
    });

    it('al iniciar sesión, actualiza la cuenta sin duplicarla, y SesionIniciada no va al outbox', async () => {
      await repositorio.guardar(nuevaCuenta());
      const cuenta = await repositorio.buscarPorCorreo(
        Correo.de('ana@example.org'),
      );
      const inicio = new Date('2026-11-07T15:30:00.456Z');

      cuenta!.registrarInicioSesion(inicio);
      await repositorio.guardar(cuenta!);

      expect(await prisma.cuentaUsuarioFila.count()).toBe(1);
      const recuperada = await repositorio.buscarPorCorreo(cuenta!.correo);
      expect(recuperada?.ultimoInicioSesionEn).toEqual(inicio);
      expect(await prisma.eventoSalidaFila.count()).toBe(1);
    });
  });

  describe('unicidad del correo (R2)', () => {
    it('un correo repetido lanza correo-ya-registrado y no deja ni la cuenta ni el evento', async () => {
      await repositorio.guardar(nuevaCuenta('ana@example.org'));
      const repetida = nuevaCuenta('ana@example.org');

      const error: unknown = await repositorio
        .guardar(repetida)
        .catch((e: unknown) => e);

      expect(error).toBeInstanceOf(ReglaDeNegocioIncumplida);
      expect(error).toMatchObject({ codigo: 'correo-ya-registrado' });
      expect(await prisma.cuentaUsuarioFila.count()).toBe(1);
      expect(await prisma.eventoSalidaFila.count()).toBe(1);
      // La transacción no se confirmó: los eventos siguen pendientes.
      expect(repetida.eventosPendientes).toHaveLength(1);
    });

    it('dos registros simultáneos con el mismo correo: solo uno gana', async () => {
      const resultados = await Promise.allSettled([
        repositorio.guardar(nuevaCuenta('ana@example.org')),
        repositorio.guardar(nuevaCuenta('ana@example.org')),
      ]);

      const rechazados = resultados.filter((r) => r.status === 'rejected');
      expect(resultados.filter((r) => r.status === 'fulfilled')).toHaveLength(
        1,
      );
      expect(rechazados).toHaveLength(1);
      expect(rechazados[0].reason).toMatchObject({
        codigo: 'correo-ya-registrado',
      });
      expect(await prisma.cuentaUsuarioFila.count()).toBe(1);
      expect(await prisma.eventoSalidaFila.count()).toBe(1);
    });
  });
});
