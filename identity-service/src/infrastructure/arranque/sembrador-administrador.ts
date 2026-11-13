import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CommandBus } from '@nestjs/cqrs';
import { CrearAdministradorInicialComando } from '../../application/comandos/crear-administrador-inicial/crear-administrador-inicial.comando.js';
import { ReglaDeNegocioIncumplida } from '../../sharedkernel/regla-de-negocio.js';

/**
 * Nombre del administrador sembrado. Es fijo: el rol ya lo pone la siembra y en
 * `.env` solo van el correo y la contraseña (decisión de Efrain, 2026-11-08).
 */
export const NOMBRE_ADMINISTRADOR = 'Administrador';

/**
 * Crea el primer administrador al arrancar, antes de aceptar peticiones, con
 * `ADMIN_CORREO` y `ADMIN_CONTRASENA`. Sin él, nadie podría aprobar campañas.
 * Es idempotente: al reiniciar el servicio no crea otro.
 */
@Injectable()
export class SembradorAdministrador implements OnApplicationBootstrap {
  private readonly logger = new Logger(SembradorAdministrador.name);

  constructor(
    private readonly comandos: CommandBus,
    private readonly configuracion: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const correo = this.configuracion.getOrThrow<string>('ADMIN_CORREO');
    const contrasena =
      this.configuracion.getOrThrow<string>('ADMIN_CONTRASENA');

    let resultado;
    try {
      resultado = await this.comandos.execute(
        new CrearAdministradorInicialComando(
          NOMBRE_ADMINISTRADOR,
          correo,
          contrasena,
        ),
      );
    } catch (error) {
      // La configuración está mal: el servicio no levanta, con un mensaje claro.
      if (error instanceof ReglaDeNegocioIncumplida) {
        throw new Error(
          `ADMIN_CORREO o ADMIN_CONTRASENA no cumplen las reglas de las cuentas: ${error.message}`,
          { cause: error },
        );
      }
      throw error;
    }

    if (resultado.creado) {
      this.logger.log(
        `Administrador inicial creado: ${correo} (id ${resultado.idUsuario}).`,
      );
    } else {
      this.logger.log(
        `Ya existe una cuenta con ADMIN_CORREO (${correo}); no se crea otra. Si esa cuenta no es ADMINISTRADOR, usa otro correo.`,
      );
    }
  }
}
