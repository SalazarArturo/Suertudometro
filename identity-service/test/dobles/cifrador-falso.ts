import { CifradorContrasenas } from '../../src/application/puertos/cifrador-contrasenas.js';
import { HashContrasena } from '../../src/domain/cuenta-usuario/hash-contrasena.js';

/**
 * Doble del cifrador: un "hash" predecible y sin costo, y contadores para
 * comprobar cuándo se calculó.
 */
export class CifradorFalso implements CifradorContrasenas {
  cifrados = 0;
  verificacionesSimuladas = 0;

  static hashDe(contrasenaEnClaro: string): HashContrasena {
    return HashContrasena.de(`hash-falso(${contrasenaEnClaro})`);
  }

  cifrar(contrasenaEnClaro: string): Promise<HashContrasena> {
    this.cifrados += 1;
    return Promise.resolve(CifradorFalso.hashDe(contrasenaEnClaro));
  }

  verificar(contrasenaEnClaro: string, hash: HashContrasena): Promise<boolean> {
    return Promise.resolve(
      hash.valor === CifradorFalso.hashDe(contrasenaEnClaro).valor,
    );
  }

  simularVerificacion(): Promise<void> {
    this.verificacionesSimuladas += 1;
    return Promise.resolve();
  }
}
