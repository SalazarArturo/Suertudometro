import { Controller, Get } from '@nestjs/common';

/**
 * Healthcheck interno para Docker Compose. No lleva el prefijo /api/identidad
 * y el gateway no lo enruta.
 */
@Controller('salud')
export class SaludControlador {
  @Get()
  verificar(): { estado: 'ok' } {
    return { estado: 'ok' };
  }
}
