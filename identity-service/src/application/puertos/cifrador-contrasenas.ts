import type { HashContrasena } from '../../domain/cuenta-usuario/hash-contrasena.js';

/**
 * Calcula y verifica el hash de las contraseñas (R5). El adaptador real usa
 * argon2id; el dominio no conoce el algoritmo.
 */
export interface CifradorContrasenas {
  cifrar(contrasenaEnClaro: string): Promise<HashContrasena>;

  verificar(contrasenaEnClaro: string, hash: HashContrasena): Promise<boolean>;

  /**
   * Verifica la contraseña contra un hash de relleno y descarta el resultado.
   * Se usa cuando el correo no existe, para que el tiempo de respuesta
   * no delate qué correos están registrados (R7).
   */
  simularVerificacion(contrasenaEnClaro: string): Promise<void>;
}
