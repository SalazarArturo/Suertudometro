// Tokens de inyección de dependencias de cada puerto. La raíz de composición
// (notificaciones.modulo.ts) une cada token con su adaptador de infrastructure.

export const UNIDAD_DE_TRABAJO = Symbol('UnidadDeTrabajo');
export const LECTOR_AVISOS = Symbol('LectorAvisos');
export const ENVIADOR_CORREO = Symbol('EnviadorCorreo');
export const RELOJ = Symbol('Reloj');
