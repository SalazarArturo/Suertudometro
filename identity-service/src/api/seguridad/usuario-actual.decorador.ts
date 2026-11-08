import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type {
  PeticionConIdentidad,
  UsuarioAutenticado,
} from './usuario-autenticado.js';

/**
 * Inyecta en el controlador quién hace la petición, tal como lo leyó
 * GuardIdentidad de los headers del gateway.
 */
export const UsuarioActual = createParamDecorator(
  (_dato: unknown, contexto: ExecutionContext): UsuarioAutenticado => {
    const { usuario } = contexto
      .switchToHttp()
      .getRequest<PeticionConIdentidad>();
    if (usuario === undefined) {
      // Solo pasa si se usa en una ruta @Publico: es un error de programación.
      throw new Error(
        '@UsuarioActual se usó en una ruta @Publico, donde no se lee la identidad.',
      );
    }
    return usuario;
  },
);
