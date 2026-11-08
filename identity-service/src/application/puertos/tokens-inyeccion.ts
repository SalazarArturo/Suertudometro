// Tokens de inyección de dependencias de cada puerto. La raíz de composición
// (identidad.modulo.ts) une cada token con su adaptador de infrastructure.

export const REPOSITORIO_CUENTAS_USUARIO = Symbol('RepositorioCuentasUsuario');
export const LECTOR_USUARIOS = Symbol('LectorUsuarios');
export const CIFRADOR_CONTRASENAS = Symbol('CifradorContrasenas');
export const EMISOR_TOKENS = Symbol('EmisorTokens');
export const RELOJ = Symbol('Reloj');
