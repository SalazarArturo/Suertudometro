import { Injectable } from '@nestjs/common';
import { argon2id, hash, verify } from 'argon2';
import { CifradorContrasenas } from '../../application/puertos/cifrador-contrasenas.js';
import { HashContrasena } from '../../domain/cuenta-usuario/hash-contrasena.js';

/**
 * Cifrador con argon2id, el algoritmo que recomienda OWASP para contraseñas.
 * Usa los parámetros por defecto de la librería (64 MiB, 3 iteraciones), que
 * superan el mínimo de OWASP. Cada hash lleva su propia sal.
 */
@Injectable()
export class CifradorArgon2 implements CifradorContrasenas {
  /** Hash de una contraseña al azar, para `simularVerificacion` (R7). */
  private hashDeRelleno: Promise<string> | undefined;

  async cifrar(contrasenaEnClaro: string): Promise<HashContrasena> {
    return HashContrasena.de(await hash(contrasenaEnClaro, { type: argon2id }));
  }

  verificar(
    contrasenaEnClaro: string,
    hashGuardado: HashContrasena,
  ): Promise<boolean> {
    return verify(hashGuardado.valor, contrasenaEnClaro);
  }

  async simularVerificacion(contrasenaEnClaro: string): Promise<void> {
    this.hashDeRelleno ??= hash(crypto.randomUUID(), { type: argon2id });
    await verify(await this.hashDeRelleno, contrasenaEnClaro);
  }
}
