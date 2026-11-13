import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Correo } from '../../../domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../../domain/cuenta-usuario/cuenta-usuario.js';
import { IdUsuario } from '../../../domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../../domain/cuenta-usuario/nombre-usuario.js';
import { PoliticaContrasena } from '../../../domain/cuenta-usuario/politica-contrasena.js';
import { CorreoDebeSerUnico } from '../../../domain/cuenta-usuario/reglas/correo-debe-ser-unico.js';
import type { RepositorioCuentasUsuario } from '../../../domain/cuenta-usuario/repositorio-cuentas-usuario.js';
import { ReglaDeNegocioIncumplida } from '../../../sharedkernel/regla-de-negocio.js';
import type { CifradorContrasenas } from '../../puertos/cifrador-contrasenas.js';
import type { Reloj } from '../../puertos/reloj.js';
import {
  CIFRADOR_CONTRASENAS,
  RELOJ,
  REPOSITORIO_CUENTAS_USUARIO,
} from '../../puertos/tokens-inyeccion.js';
import {
  CrearAdministradorInicialComando,
  ResultadoCreacionAdministrador,
} from './crear-administrador-inicial.comando.js';

/**
 * Idempotente: si ya hay una cuenta con ese correo (de una ejecución anterior,
 * o de otra instancia que ganó la carrera), no hace nada.
 */
@CommandHandler(CrearAdministradorInicialComando)
export class CrearAdministradorInicialComandoManejador implements ICommandHandler<CrearAdministradorInicialComando> {
  constructor(
    @Inject(REPOSITORIO_CUENTAS_USUARIO)
    private readonly repositorio: RepositorioCuentasUsuario,
    @Inject(CIFRADOR_CONTRASENAS)
    private readonly cifrador: CifradorContrasenas,
    @Inject(RELOJ)
    private readonly reloj: Reloj,
  ) {}

  async execute(
    comando: CrearAdministradorInicialComando,
  ): Promise<ResultadoCreacionAdministrador> {
    const correo = Correo.de(comando.correo);
    if (await this.repositorio.existeConCorreo(correo)) {
      return { creado: false };
    }
    const nombre = NombreUsuario.de(comando.nombre);
    PoliticaContrasena.verificar(comando.contrasena);

    const cuenta = CuentaUsuario.registrarAdministrador({
      id: IdUsuario.nuevo(),
      correo,
      nombre,
      hashContrasena: await this.cifrador.cifrar(comando.contrasena),
      ahora: this.reloj.ahora(),
    });
    try {
      await this.repositorio.guardar(cuenta);
    } catch (error) {
      if (
        error instanceof ReglaDeNegocioIncumplida &&
        error.regla instanceof CorreoDebeSerUnico
      ) {
        return { creado: false };
      }
      throw error;
    }
    return { creado: true, idUsuario: cuenta.id.valor };
  }
}
