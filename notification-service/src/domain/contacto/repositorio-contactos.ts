import type { Contacto } from './contacto.js';

export interface RepositorioContactos {
  /** Guarda el contacto, o actualiza su correo si ya existía. */
  guardar(contacto: Contacto): Promise<void>;
}
