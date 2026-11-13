import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES } from '../../application/vistas/usuario-vista.js';
import { NoAutenticado } from '../errores/error-de-api.js';
import { ES_PUBLICO } from './publico.decorador.js';
import {
  CABECERA_ID,
  CABECERA_NOMBRE,
  CABECERA_ROL,
  PeticionConIdentidad,
  UsuarioAutenticado,
} from './usuario-autenticado.js';

/**
 * Exige la identidad en todas las rutas salvo las marcadas con `@Publico`.
 *
 * El servicio no valida el JWT: eso lo hace el gateway, que después borra los
 * `X-Usuario-*` que mande el cliente y pone los suyos (§5.1). Aquí solo se leen
 * esos headers y se dejan en la petición para `@UsuarioActual`.
 */
@Injectable()
export class GuardIdentidad implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const esPublica = this.reflector.getAllAndOverride<boolean | undefined>(
      ES_PUBLICO,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (esPublica === true) {
      return true;
    }
    const peticion = contexto.switchToHttp().getRequest<PeticionConIdentidad>();
    peticion.usuario = leerIdentidad(peticion);
    return true;
  }
}

/**
 * Lee los tres headers del gateway. Si falta alguno o no se puede leer, la
 * petición no está autenticada: responde 401 `no-autenticado`. El formato del
 * id (UUID) lo valida el dominio cuando se usa.
 */
export function leerIdentidad(peticion: Request): UsuarioAutenticado {
  const id = peticion.header(CABECERA_ID)?.trim();
  if (!id) {
    throw new NoAutenticado(`falta el header ${CABECERA_ID}.`);
  }

  const rol = peticion.header(CABECERA_ROL)?.trim();
  if (!esRol(rol)) {
    throw new NoAutenticado(
      `el header ${CABECERA_ROL} debe ser ${ROLES.join(' o ')}.`,
    );
  }

  const nombreCodificado = peticion.header(CABECERA_NOMBRE);
  if (nombreCodificado === undefined) {
    throw new NoAutenticado(`falta el header ${CABECERA_NOMBRE}.`);
  }
  return { id, rol, nombre: decodificarNombre(nombreCodificado) };
}

function esRol(valor: string | undefined): valor is UsuarioAutenticado['rol'] {
  return (ROLES as readonly (string | undefined)[]).includes(valor);
}

// El gateway codifica el nombre para URL (percent-encoding), porque un header
// no admite tildes ni ñ: "Ana%20P%C3%A9rez" → "Ana Pérez".
function decodificarNombre(nombreCodificado: string): string {
  try {
    return decodeURIComponent(nombreCodificado);
  } catch {
    throw new NoAutenticado(
      `el header ${CABECERA_NOMBRE} no está codificado para URL (UTF-8).`,
    );
  }
}
