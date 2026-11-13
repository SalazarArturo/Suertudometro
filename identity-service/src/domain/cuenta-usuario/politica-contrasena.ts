import { verificarRegla } from '../../sharedkernel/regla-de-negocio.js';
import { ContrasenaDebeTenerLongitudValida } from './reglas/contrasena-debe-tener-longitud-valida.js';

/**
 * Valida la contraseña en claro antes de calcular su hash (R4). Después de esta
 * validación, la contraseña en claro solo llega al puerto `CifradorContrasenas`.
 */
export class PoliticaContrasena {
  static verificar(contrasenaEnClaro: string): void {
    verificarRegla(new ContrasenaDebeTenerLongitudValida(contrasenaEnClaro));
  }
}
