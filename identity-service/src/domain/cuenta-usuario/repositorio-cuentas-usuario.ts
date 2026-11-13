import { Correo } from './correo.js';
import { CuentaUsuario } from './cuenta-usuario.js';

/**
 * Persistencia de las cuentas. La implementación con Prisma vive en
 * infrastructure; el dominio solo conoce esta interfaz.
 */
export interface RepositorioCuentasUsuario {
  buscarPorCorreo(correo: Correo): Promise<CuentaUsuario | null>;

  existeConCorreo(correo: Correo): Promise<boolean>;

  /**
   * Inserta o actualiza la cuenta y, en la misma transacción, guarda en el outbox
   * los eventos que salen al bus (docs/servicios/identity-service.md §6).
   * Después de guardar, la cuenta queda sin eventos pendientes.
   *
   * Si otra cuenta ganó la carrera por el mismo correo, lanza
   * `ReglaDeNegocioIncumplida` con el código `correo-ya-registrado` (R2).
   */
  guardar(cuenta: CuentaUsuario): Promise<void>;
}
