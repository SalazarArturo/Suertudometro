import { Correo } from '../../domain/cuenta-usuario/correo.js';
import { CuentaUsuario } from '../../domain/cuenta-usuario/cuenta-usuario.js';
import { HashContrasena } from '../../domain/cuenta-usuario/hash-contrasena.js';
import { IdUsuario } from '../../domain/cuenta-usuario/id-usuario.js';
import { NombreUsuario } from '../../domain/cuenta-usuario/nombre-usuario.js';
import { Rol } from '../../domain/cuenta-usuario/rol.js';
import { CuentaUsuarioFila, RolUsuario } from './prisma/generado/client.js';

// Mapper entre el agregado del dominio y la fila del ORM: el dominio no conoce
// Prisma, y Prisma no conoce las reglas del dominio.

/** Los campos que escribe el repositorio; `actualizado_en` lo pone Prisma. */
export type CuentaUsuarioFilaEscritura = Omit<
  CuentaUsuarioFila,
  'actualizadoEn'
>;

export function cuentaAFila(cuenta: CuentaUsuario): CuentaUsuarioFilaEscritura {
  return {
    id: cuenta.id.valor,
    correo: cuenta.correo.valor,
    nombre: cuenta.nombre.valor,
    hashContrasena: cuenta.hashContrasena.valor,
    rol: rolAFila(cuenta.rol),
    ultimoInicioSesionEn: cuenta.ultimoInicioSesionEn,
    creadoEn: cuenta.registradoEn,
  };
}

/**
 * Reconstruye la cuenta pasando por los objetos de valor: si una fila tuviera
 * un dato que el dominio no acepta, falla aquí y no más adelante.
 */
export function cuentaADominio(fila: CuentaUsuarioFila): CuentaUsuario {
  return CuentaUsuario.reconstituir({
    id: IdUsuario.de(fila.id),
    correo: Correo.de(fila.correo),
    nombre: NombreUsuario.de(fila.nombre),
    hashContrasena: HashContrasena.de(fila.hashContrasena),
    rol: rolADominio(fila.rol),
    registradoEn: fila.creadoEn,
    ultimoInicioSesionEn: fila.ultimoInicioSesionEn,
  });
}

export function rolADominio(rol: RolUsuario): Rol {
  switch (rol) {
    case RolUsuario.USUARIO:
      return Rol.Usuario;
    case RolUsuario.ADMINISTRADOR:
      return Rol.Administrador;
  }
}

function rolAFila(rol: Rol): RolUsuario {
  switch (rol) {
    case Rol.Usuario:
      return RolUsuario.USUARIO;
    case Rol.Administrador:
      return RolUsuario.ADMINISTRADOR;
  }
}
