import type { RepositorioAvisos } from '../../domain/aviso/repositorio-avisos.js';
import type { RepositorioCampanas } from '../../domain/campana/repositorio-campanas.js';
import type { RepositorioContactos } from '../../domain/contacto/repositorio-contactos.js';
import type { RegistroEventos } from './registro-eventos.js';

/** Los repositorios de una misma transacción. */
export interface Transaccion {
  readonly contactos: RepositorioContactos;
  readonly campanas: RepositorioCampanas;
  readonly avisos: RepositorioAvisos;
  readonly eventos: RegistroEventos;
}

/** Todo lo que hace `trabajo` se guarda junto, o no se guarda nada. */
export interface UnidadDeTrabajo {
  ejecutar<T>(trabajo: (transaccion: Transaccion) => Promise<T>): Promise<T>;
}
