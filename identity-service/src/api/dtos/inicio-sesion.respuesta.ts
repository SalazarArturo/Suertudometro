import { ApiProperty } from '@nestjs/swagger';
import type { ResultadoInicioSesion } from '../../application/comandos/iniciar-sesion/iniciar-sesion.comando.js';
import { ROLES } from '../../application/vistas/usuario-vista.js';

/** El usuario que acaba de iniciar sesión, para que el frontend lo muestre. */
export class UsuarioSesionRespuesta {
  @ApiProperty({
    format: 'uuid',
    example: 'e3b68016-9750-41b3-9e34-762dd8346001',
  })
  id: string;

  @ApiProperty({ example: 'Ana Pérez' })
  nombre: string;

  @ApiProperty({ example: 'ana@example.org' })
  correo: string;

  @ApiProperty({ enum: ROLES, example: 'USUARIO' })
  rol: ResultadoInicioSesion['usuario']['rol'];
}

/** Respuesta de `POST /api/identidad/sesiones` (§5 y §5.1). */
export class InicioSesionRespuesta {
  @ApiProperty({
    description:
      'JWT HS256 con los claims sub, correo, nombre, rol, iat y exp. Se envía al gateway como `Authorization: Bearer <token>`.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  tokenAcceso: string;

  @ApiProperty({ enum: ['Bearer'], example: 'Bearer' })
  tipoToken: 'Bearer';

  @ApiProperty({
    description:
      'Cuándo caduca el token. No hay refresh: después hay que volver a iniciar sesión.',
    format: 'date-time',
    example: '2026-11-07T15:00:00.000Z',
  })
  expiraEn: string;

  @ApiProperty({ type: UsuarioSesionRespuesta })
  usuario: UsuarioSesionRespuesta;

  static desde(resultado: ResultadoInicioSesion): InicioSesionRespuesta {
    return {
      tokenAcceso: resultado.tokenAcceso,
      tipoToken: resultado.tipoToken,
      expiraEn: resultado.expiraEn.toISOString(),
      usuario: { ...resultado.usuario },
    };
  }
}
