import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { PerfilControlador } from './api/controladores/perfil.controlador.js';
import { SaludControlador } from './api/controladores/salud.controlador.js';
import { SesionesControlador } from './api/controladores/sesiones.controlador.js';
import { UsuariosControlador } from './api/controladores/usuarios.controlador.js';
import { GuardIdentidad } from './api/seguridad/guard-identidad.js';
import { CrearAdministradorInicialComandoManejador } from './application/comandos/crear-administrador-inicial/crear-administrador-inicial.comando-manejador.js';
import { IniciarSesionComandoManejador } from './application/comandos/iniciar-sesion/iniciar-sesion.comando-manejador.js';
import { RegistrarUsuarioComandoManejador } from './application/comandos/registrar-usuario/registrar-usuario.comando-manejador.js';
import { ObtenerUsuarioPorIdConsultaManejador } from './application/consultas/obtener-usuario-por-id/obtener-usuario-por-id.consulta-manejador.js';
import {
  CIFRADOR_CONTRASENAS,
  EMISOR_TOKENS,
  LECTOR_USUARIOS,
  RELOJ,
  REPOSITORIO_CUENTAS_USUARIO,
} from './application/puertos/tokens-inyeccion.js';
import { SembradorAdministrador } from './infrastructure/arranque/sembrador-administrador.js';
import { validarVariablesEntorno } from './infrastructure/configuracion/variables-entorno.js';
import { LectorUsuariosPrisma } from './infrastructure/persistencia/lector-usuarios.prisma.js';
import { PrismaServicio } from './infrastructure/persistencia/prisma.servicio.js';
import { RepositorioCuentasUsuarioPrisma } from './infrastructure/persistencia/repositorio-cuentas-usuario.prisma.js';
import { RelojSistema } from './infrastructure/reloj/reloj-sistema.js';
import { CifradorArgon2 } from './infrastructure/seguridad/cifrador-argon2.js';
import { EmisorTokensJwt } from './infrastructure/seguridad/emisor-tokens-jwt.js';

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
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configuracion: ConfigService) => ({
        secret: configuracion.getOrThrow<string>('JWT_SECRETO'),
        signOptions: { algorithm: 'HS256' },
      }),
    }),
  ],
  controllers: [
    SaludControlador,
    UsuariosControlador,
    SesionesControlador,
    PerfilControlador,
  ],
  providers: [
    // Puertos → adaptadores
    PrismaServicio,
    {
      provide: REPOSITORIO_CUENTAS_USUARIO,
      useClass: RepositorioCuentasUsuarioPrisma,
    },
    { provide: LECTOR_USUARIOS, useClass: LectorUsuariosPrisma },
    { provide: CIFRADOR_CONTRASENAS, useClass: CifradorArgon2 },
    { provide: EMISOR_TOKENS, useClass: EmisorTokensJwt },
    { provide: RELOJ, useClass: RelojSistema },

    // Casos de uso (CQRS)
    RegistrarUsuarioComandoManejador,
    IniciarSesionComandoManejador,
    CrearAdministradorInicialComandoManejador,
    ObtenerUsuarioPorIdConsultaManejador,

    // Arranque y borde HTTP
    SembradorAdministrador,
    // Toda ruta requiere los headers de identidad, salvo las @Publico.
    { provide: APP_GUARD, useClass: GuardIdentidad },
  ],
})
export class IdentidadModulo {}
