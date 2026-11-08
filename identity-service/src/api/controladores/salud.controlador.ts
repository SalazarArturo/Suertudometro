import { Controller, Get } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { Publico } from '../seguridad/publico.decorador.js';

/**
 * Healthcheck interno para Docker Compose. No lleva el prefijo /api/identidad
 * y el gateway no lo enruta, así que tampoco aparece en la documentación.
 */
@Publico()
@ApiExcludeController()
@Controller('salud')
export class SaludControlador {
  @Get()
  verificar(): { estado: 'ok' } {
    return { estado: 'ok' };
  }
}
