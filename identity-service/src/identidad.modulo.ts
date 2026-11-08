import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SaludControlador } from './api/controladores/salud.controlador.js';
import { validarVariablesEntorno } from './infrastructure/configuracion/variables-entorno.js';

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
  ],
  controllers: [SaludControlador],
})
export class IdentidadModulo {}
