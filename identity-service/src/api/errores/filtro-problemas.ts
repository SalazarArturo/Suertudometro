import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ErrorDeAplicacion } from '../../application/errores/error-de-aplicacion.js';
import { ErrorDeDominio } from '../../sharedkernel/error-de-dominio.js';
import {
  CODIGO_VALIDACION,
  ESTADO_POR_CODIGO,
  tituloDe,
} from './catalogo-errores.js';
import { ErrorDeValidacion } from './error-de-validacion.js';
import {
  BASE_TIPO_ERROR,
  Problema,
  TIPO_CONTENIDO_PROBLEMA,
} from './problema.js';

/**
 * Traduce cualquier error a RFC 9457 en un solo lugar. Los casos de uso lanzan
 * errores de dominio o de aplicación sin saber nada de HTTP; aquí se decide el
 * estado con el catálogo de errores.
 */
@Catch()
export class FiltroProblemas implements ExceptionFilter {
  private readonly logger = new Logger(FiltroProblemas.name);

  catch(error: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const peticion = http.getRequest<Request>();
    const problema = aProblema(error, rutaDe(peticion));

    if (problema.status >= 500) {
      this.logger.error(
        `${peticion.method} ${problema.instance}`,
        error instanceof Error ? error.stack : String(error),
      );
    }

    http
      .getResponse<Response>()
      .status(problema.status)
      .type(TIPO_CONTENIDO_PROBLEMA)
      .json(problema);
  }
}

/** Arma el cuerpo RFC 9457 de un error. Es una función pura, para probarla sola. */
export function aProblema(error: unknown, instancia: string): Problema {
  if (error instanceof ErrorDeValidacion) {
    return {
      ...propio(CODIGO_VALIDACION, HttpStatus.BAD_REQUEST, instancia),
      detail: error.message,
      errores: error.errores,
    };
  }
  if (error instanceof ErrorDeDominio) {
    const estado = ESTADO_POR_CODIGO[error.codigo] ?? HttpStatus.BAD_REQUEST;
    return {
      ...propio(error.codigo, estado, instancia),
      detail: error.message,
    };
  }
  if (error instanceof ErrorDeAplicacion) {
    const estado = ESTADO_POR_CODIGO[error.codigo];
    if (estado !== undefined) {
      return {
        ...propio(error.codigo, estado, instancia),
        detail: error.message,
      };
    }
  }
  if (error instanceof HttpException) {
    // Errores HTTP sin significado propio: ruta inexistente, JSON mal formado...
    const estado = error.getStatus();
    return {
      type: 'about:blank',
      title: tituloDe(estado),
      status: estado,
      detail: detalleDe(error),
      instance: instancia,
    };
  }
  // Un error inesperado: el detalle no se muestra, para no filtrar nada interno.
  return {
    type: 'about:blank',
    title: tituloDe(HttpStatus.INTERNAL_SERVER_ERROR),
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    detail: 'Ocurrió un error inesperado. Intenta de nuevo más tarde.',
    instance: instancia,
  };
}

function propio(
  codigo: string,
  estado: number,
  instancia: string,
): Omit<Problema, 'detail'> {
  return {
    type: `${BASE_TIPO_ERROR}${codigo}`,
    title: tituloDe(estado),
    status: estado,
    instance: instancia,
  };
}

function detalleDe(excepcion: HttpException): string {
  const cuerpo = excepcion.getResponse();
  if (typeof cuerpo === 'string') {
    return cuerpo;
  }
  const { message } = cuerpo as { message?: unknown };
  if (Array.isArray(message)) {
    return message.join('; ');
  }
  return typeof message === 'string' ? message : excepcion.message;
}

/** La ruta pedida, sin la query string. */
function rutaDe(peticion: Request): string {
  return peticion.originalUrl.split('?')[0];
}
