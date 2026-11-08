import { ApiProperty } from '@nestjs/swagger';
import { ROLES, UsuarioVista } from '../../application/vistas/usuario-vista.js';

/**
 * Una cuenta, tal como la ve su dueño: en la respuesta del registro y en el
 * perfil. Nunca lleva el hash de la contraseña (R5).
 */
export class UsuarioRespuesta {
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
  rol: UsuarioVista['rol'];

  @ApiProperty({ format: 'date-time', example: '2026-11-07T14:00:00.000Z' })
  registradoEn: string;

  static desde(vista: UsuarioVista): UsuarioRespuesta {
    return {
      id: vista.id,
      nombre: vista.nombre,
      correo: vista.correo,
      rol: vista.rol,
      registradoEn: vista.registradoEn.toISOString(),
    };
  }
}
