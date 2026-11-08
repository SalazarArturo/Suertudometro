import { Injectable } from '@nestjs/common';
import { LectorUsuarios } from '../../application/puertos/lector-usuarios.js';
import { UsuarioVista } from '../../application/vistas/usuario-vista.js';
import { IdUsuario } from '../../domain/cuenta-usuario/id-usuario.js';
import { rolADominio } from './cuenta-usuario.mapper.js';
import { PrismaServicio } from './prisma.servicio.js';

/**
 * Lado de lectura (CQRS): consulta solo las columnas de la vista. No trae el
 * hash de la contraseña ni reconstruye el agregado.
 */
@Injectable()
export class LectorUsuariosPrisma implements LectorUsuarios {
  constructor(private readonly prisma: PrismaServicio) {}

  async obtenerPorId(id: IdUsuario): Promise<UsuarioVista | null> {
    const fila = await this.prisma.cuentaUsuarioFila.findUnique({
      where: { id: id.valor },
      select: {
        id: true,
        nombre: true,
        correo: true,
        rol: true,
        creadoEn: true,
      },
    });
    if (fila === null) {
      return null;
    }
    return {
      id: fila.id,
      nombre: fila.nombre,
      correo: fila.correo,
      rol: rolADominio(fila.rol),
      registradoEn: fila.creadoEn,
    };
  }
}
