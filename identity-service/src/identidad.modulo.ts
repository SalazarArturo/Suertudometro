import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { SaludControlador } from './api/controladores/salud.controlador.js';
import { UsuariosControlador } from './api/controladores/usuarios.controlador.js';
import { RegistrarUsuarioComandoManejador } from './application/comandos/registrar-usuario/registrar-usuario.comando-manejador.js';
import {
  CIFRADOR_CONTRASENAS,
  RELOJ,
  REPOSITORIO_CUENTAS_USUARIO,
} from './application/puertos/tokens-inyeccion.js';
import { validarVariablesEntorno } from './infrastructure/configuracion/variables-entorno.js';
import { PrismaServicio } from './infrastructure/persistencia/prisma.servicio.js';
import { RepositorioCuentasUsuarioPrisma } from './infrastructure/persistencia/repositorio-cuentas-usuario.prisma.js';
import { RelojSistema } from './infrastructure/reloj/reloj-sistema.js';
import { CifradorArgon2 } from './infrastructure/seguridad/cifrador-argon2.js';

/**
 * Módulo raíz y raíz de composición del servicio: aquí se une cada puerto
 * de application con su adaptador de infrastructure.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validarVariablesEntorno,
    }),
    CqrsModule.forRoot(),
  ],
  controllers: [SaludControlador, UsuariosControlador],
  providers: [
    PrismaServicio,
    {
      provide: REPOSITORIO_CUENTAS_USUARIO,
      useClass: RepositorioCuentasUsuarioPrisma,
    },
    { provide: CIFRADOR_CONTRASENAS, useClass: CifradorArgon2 },
    { provide: RELOJ, useClass: RelojSistema },
    RegistrarUsuarioComandoManejador,
  ],
})
export class IdentidadModulo {}
