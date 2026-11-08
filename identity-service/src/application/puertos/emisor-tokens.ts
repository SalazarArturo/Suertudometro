import type { Rol } from '../../domain/cuenta-usuario/rol.js';

/** Los claims del token (docs/servicios/identity-service.md §5.1), sin `iat` ni `exp`. */
export interface DatosDelToken {
  idUsuario: string;
  correo: string;
  nombre: string;
  rol: Rol;
}

export interface TokenEmitido {
  tokenAcceso: string;
  expiraEn: Date;
}

/** Emite el token de acceso. El adaptador real firma un JWT HS256 que dura 1 hora. */
export interface EmisorTokens {
  emitir(datos: DatosDelToken): Promise<TokenEmitido>;
}
