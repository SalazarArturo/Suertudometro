import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import type { MockInstance } from 'vitest';
import { CrearAdministradorInicialComando } from '../../application/comandos/crear-administrador-inicial/crear-administrador-inicial.comando.js';
import { ReglaDeNegocioIncumplida } from '../../sharedkernel/regla-de-negocio.js';
import {
  NOMBRE_ADMINISTRADOR,
  SembradorAdministrador,
} from './sembrador-administrador.js';

const CORREO = 'admin@suertudometro.local';
const CONTRASENA = 'clave del administrador';

describe('SembradorAdministrador', () => {
  let execute: ReturnType<typeof vi.fn>;
  let log: MockInstance<Logger['log']>;
  let sembrador: SembradorAdministrador;

  beforeEach(() => {
    execute = vi.fn();
    log = vi.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    sembrador = new SembradorAdministrador(
      { execute } as unknown as CommandBus,
      new ConfigService({ ADMIN_CORREO: CORREO, ADMIN_CONTRASENA: CONTRASENA }),
    );
  });

  afterEach(() => {
    log.mockRestore();
  });

  it('ejecuta CrearAdministradorInicial con el nombre fijo y las variables de entorno', async () => {
    execute.mockResolvedValue({ creado: true, idUsuario: 'id-del-admin' });

    await sembrador.onApplicationBootstrap();

    expect(execute).toHaveBeenCalledWith(
      new CrearAdministradorInicialComando('Administrador', CORREO, CONTRASENA),
    );
    expect(NOMBRE_ADMINISTRADOR).toBe('Administrador');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('id-del-admin'));
  });

  it('si el administrador ya existe, solo lo deja en el log', async () => {
    execute.mockResolvedValue({ creado: false });

    await expect(sembrador.onApplicationBootstrap()).resolves.toBeUndefined();
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('no se crea otra'),
    );
  });

  it('nunca escribe la contraseña en el log', async () => {
    execute.mockResolvedValue({ creado: true, idUsuario: 'id-del-admin' });

    await sembrador.onApplicationBootstrap();

    const mensajes = log.mock.calls.flat().join(' ');
    expect(mensajes).not.toContain(CONTRASENA);
  });

  it('si la configuración no cumple una regla, no deja arrancar y explica qué variable revisar', async () => {
    execute.mockRejectedValue(
      new ReglaDeNegocioIncumplida({
        codigo: 'contrasena-invalida',
        mensaje: 'La contraseña debe tener entre 8 y 128 caracteres.',
        seIncumple: () => true,
      }),
    );

    await expect(sembrador.onApplicationBootstrap()).rejects.toThrow(
      'ADMIN_CORREO o ADMIN_CONTRASENA no cumplen las reglas de las cuentas: La contraseña debe tener entre 8 y 128 caracteres.',
    );
  });

  it('cualquier otro error sigue de largo', async () => {
    const caida = new Error('se cayó la base');
    execute.mockRejectedValue(caida);

    await expect(sembrador.onApplicationBootstrap()).rejects.toBe(caida);
  });
});
