import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { CqrsModule } from '@nestjs/cqrs';
import { AvisosControlador } from './api/controladores/avisos.controlador.js';
import { SaludControlador } from './api/controladores/salud.controlador.js';
import { GuardIdentidad } from './api/seguridad/guard-identidad.js';
import { EnviarCorreosPendientesComandoManejador } from './application/comandos/enviar-correos-pendientes/enviar-correos-pendientes.comando-manejador.js';
import { MarcarAvisoLeidoComandoManejador } from './application/comandos/marcar-aviso-leido/marcar-aviso-leido.comando-manejador.js';
import { MarcarAvisosLeidosComandoManejador } from './application/comandos/marcar-avisos-leidos/marcar-avisos-leidos.comando-manejador.js';
import { ProcesarEventoComandoManejador } from './application/comandos/procesar-evento/procesar-evento.comando-manejador.js';
import { ObtenerAvisosPorDestinatarioConsultaManejador } from './application/consultas/obtener-avisos-por-destinatario/obtener-avisos-por-destinatario.consulta-manejador.js';
import { ObtenerNoLeidosPorDestinatarioConsultaManejador } from './application/consultas/obtener-no-leidos-por-destinatario/obtener-no-leidos-por-destinatario.consulta-manejador.js';
import {
  ENVIADOR_CORREO,
  LECTOR_AVISOS,
  RELOJ,
  UNIDAD_DE_TRABAJO,
} from './application/puertos/tokens-inyeccion.js';
import { validarVariablesEntorno } from './infrastructure/configuracion/variables-entorno.js';
import { DespachadorCorreos } from './infrastructure/correo/despachador-correos.js';
import { EnviadorSmtp } from './infrastructure/correo/enviador-smtp.js';
import { ConsumidorEventos } from './infrastructure/mensajeria/consumidor-eventos.js';
import { LectorAvisosPrisma } from './infrastructure/persistencia/lector-avisos.prisma.js';
import { PrismaServicio } from './infrastructure/persistencia/prisma.servicio.js';
import { UnidadDeTrabajoPrisma } from './infrastructure/persistencia/unidad-de-trabajo.prisma.js';
import { RelojSistema } from './infrastructure/reloj/reloj-sistema.js';

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
  controllers: [SaludControlador, AvisosControlador],
  providers: [
    // Puertos → adaptadores
    PrismaServicio,
    { provide: UNIDAD_DE_TRABAJO, useClass: UnidadDeTrabajoPrisma },
    { provide: LECTOR_AVISOS, useClass: LectorAvisosPrisma },
    { provide: ENVIADOR_CORREO, useClass: EnviadorSmtp },
    { provide: RELOJ, useClass: RelojSistema },

    // Casos de uso (CQRS)
    ProcesarEventoComandoManejador,
    EnviarCorreosPendientesComandoManejador,
    MarcarAvisoLeidoComandoManejador,
    MarcarAvisosLeidosComandoManejador,
    ObtenerAvisosPorDestinatarioConsultaManejador,
    ObtenerNoLeidosPorDestinatarioConsultaManejador,

    // Entrada por eventos y salida por correo (notification-service.md §6)
    ConsumidorEventos,
    DespachadorCorreos,

    // Toda ruta requiere los headers de identidad, salvo las @Publico.
    { provide: APP_GUARD, useClass: GuardIdentidad },
  ],
})
export class NotificacionesModulo {}
