import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Correo } from '../../../domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../../domain/cuenta-usuario/cuenta-usuario.js';
import { IdUsuario } from '../../../domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../../domain/cuenta-usuario/nombre-usuario.js';
import { PoliticaContrasena } from '../../../domain/cuenta-usuario/politica-contrasena.js';
import { CorreoDebeSerUnico } from '../../../domain/cuenta-usuario/reglas/correo-debe-ser-unico.js';
import type { RepositorioCuentasUsuario } from '../../../domain/cuenta-usuario/repositorio-cuentas-usuario.js';
import { verificarRegla } from '../../../sharedkernel/regla-de-negocio.js';
import type { CifradorContrasenas } from '../../puertos/cifrador-contrasenas.js';
import type { Reloj } from '../../puertos/reloj.js';
import {
  CIFRADOR_CONTRASENAS,
  RELOJ,
  REPOSITORIO_CUENTAS_USUARIO,
} from '../../puertos/tokens-inyeccion.js';
import { aUsuarioVista, UsuarioVista } from '../../vistas/usuario-vista.js';
import { RegistrarUsuarioComando } from './registrar-usuario.comando.js';

@CommandHandler(RegistrarUsuarioComando)
export class RegistrarUsuarioComandoManejador implements ICommandHandler<RegistrarUsuarioComando> {
  constructor(
    @Inject(REPOSITORIO_CUENTAS_USUARIO)
    private readonly repositorio: RepositorioCuentasUsuario,
    @Inject(CIFRADOR_CONTRASENAS)
    private readonly cifrador: CifradorContrasenas,
    @Inject(RELOJ)
    private readonly reloj: Reloj,
  ) {}

  async execute(comando: RegistrarUsuarioComando): Promise<UsuarioVista> {
    // Primero las reglas que no cuestan nada (R1, R3 y R4); después la consulta
    // de unicidad (R2) y, al final, el hash, que es lo más caro.
    const correo = Correo.de(comando.correo);
    const nombre = NombreUsuario.de(comando.nombre);
    PoliticaContrasena.verificar(comando.contrasena);
    verificarRegla(
      new CorreoDebeSerUnico(await this.repositorio.existeConCorreo(correo)),
    );

    const cuenta = CuentaUsuario.registrar({
      id: IdUsuario.nuevo(),
      correo,
      nombre,
      hashContrasena: await this.cifrador.cifrar(comando.contrasena),
      ahora: this.reloj.ahora(),
    });
    // Si otra cuenta ganó la carrera por el mismo correo, guardar() lanza
    // correo-ya-registrado (R2), y el error sigue de largo hasta la API.
    await this.repositorio.guardar(cuenta);

    return aUsuarioVista(cuenta);
  }
}
