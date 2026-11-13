import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Correo } from '../../../domain/cuenta-usuario/correo.js';
import type { RepositorioCuentasUsuario } from '../../../domain/cuenta-usuario/repositorio-cuentas-usuario.js';
import { CredencialesInvalidas } from '../../errores/credenciales-invalidas.js';
import type { CifradorContrasenas } from '../../puertos/cifrador-contrasenas.js';
import type { EmisorTokens } from '../../puertos/emisor-tokens.js';
import type { Reloj } from '../../puertos/reloj.js';
import {
  CIFRADOR_CONTRASENAS,
  EMISOR_TOKENS,
  RELOJ,
  REPOSITORIO_CUENTAS_USUARIO,
} from '../../puertos/tokens-inyeccion.js';
import {
  IniciarSesionComando,
  ResultadoInicioSesion,
} from './iniciar-sesion.comando.js';

@CommandHandler(IniciarSesionComando)
export class IniciarSesionComandoManejador implements ICommandHandler<IniciarSesionComando> {
  constructor(
    @Inject(REPOSITORIO_CUENTAS_USUARIO)
    private readonly repositorio: RepositorioCuentasUsuario,
    @Inject(CIFRADOR_CONTRASENAS)
    private readonly cifrador: CifradorContrasenas,
    @Inject(EMISOR_TOKENS)
    private readonly emisor: EmisorTokens,
    @Inject(RELOJ)
    private readonly reloj: Reloj,
  ) {}

  async execute(comando: IniciarSesionComando): Promise<ResultadoInicioSesion> {
    const cuenta = await this.repositorio.buscarPorCorreo(
      Correo.de(comando.correo),
    );

    // R7: correo inexistente y contraseña incorrecta dan el mismo error, y en
    // los dos casos se calcula un hash, para que el tiempo no los distinga.
    if (cuenta === null) {
      await this.cifrador.simularVerificacion(comando.contrasena);
      throw new CredencialesInvalidas();
    }
    const coincide = await this.cifrador.verificar(
      comando.contrasena,
      cuenta.hashContrasena,
    );
    if (!coincide) {
      throw new CredencialesInvalidas();
    }

    cuenta.registrarInicioSesion(this.reloj.ahora());
    await this.repositorio.guardar(cuenta);

    const usuario = {
      id: cuenta.id.valor,
      nombre: cuenta.nombre.valor,
      correo: cuenta.correo.valor,
      rol: cuenta.rol,
    };
    const { tokenAcceso, expiraEn } = await this.emisor.emitir({
      idUsuario: usuario.id,
      correo: usuario.correo,
      nombre: usuario.nombre,
      rol: usuario.rol,
    });

    return { tokenAcceso, tipoToken: 'Bearer', expiraEn, usuario };
  }
}
