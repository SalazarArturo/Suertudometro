import { SetMetadata } from '@nestjs/common';

export const ES_PUBLICO = 'identidad:es-publico';

/**
 * Marca una ruta (o un controlador entero) que no necesita sesión. Todas las
 * demás la necesitan: GuardIdentidad es global, así que una ruta nueva nace
 * protegida.
 */
export const Publico = (): MethodDecorator & ClassDecorator =>
  SetMetadata(ES_PUBLICO, true);
