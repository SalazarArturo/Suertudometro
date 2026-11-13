import { Correo } from '../../../src/domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../../src/domain/cuenta-usuario/cuenta-usuario.js';
import { HashContrasena } from '../../../src/domain/cuenta-usuario/hash-contrasena.js';
import { IdUsuario } from '../../../src/domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../../src/domain/cuenta-usuario/nombre-usuario.js';
import { Rol } from '../../../src/domain/cuenta-usuario/rol.js';
import { LectorUsuariosPrisma } from '../../../src/infrastructure/persistencia/lector-usuarios.prisma.js';
import { PrismaServicio } from '../../../src/infrastructure/persistencia/prisma.servicio.js';
import { RepositorioCuentasUsuarioPrisma } from '../../../src/infrastructure/persistencia/repositorio-cuentas-usuario.prisma.js';
import { crearPrisma, vaciarTablas } from '../../base-datos/base-datos.js';

const REGISTRO = new Date('2026-11-07T14:00:00.000Z');

describe('LectorUsuariosPrisma (PostgreSQL)', () => {
  let prisma: PrismaServicio;
  let lector: LectorUsuariosPrisma;
  let cuenta: CuentaUsuario;

  beforeAll(() => {
    prisma = crearPrisma();
    lector = new LectorUsuariosPrisma(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await vaciarTablas(prisma);
    cuenta = CuentaUsuario.registrar({
      id: IdUsuario.nuevo(),
      correo: Correo.de('ana@example.org'),
      nombre: NombreUsuario.de('Ana Pérez'),
      hashContrasena: HashContrasena.de('$argon2id$falso'),
      ahora: REGISTRO,
    });
    await new RepositorioCuentasUsuarioPrisma(prisma).guardar(cuenta);
  });

  it('devuelve la vista del usuario, sin el hash de la contraseña', async () => {
    const vista = await lector.obtenerPorId(cuenta.id);

    expect(vista).toEqual({
      id: cuenta.id.valor,
      nombre: 'Ana Pérez',
      correo: 'ana@example.org',
      rol: Rol.Usuario,
      registradoEn: REGISTRO,
    });
  });

  it('devuelve null si la cuenta no existe', async () => {
    await expect(lector.obtenerPorId(IdUsuario.nuevo())).resolves.toBeNull();
  });
});
