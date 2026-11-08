import { LectorUsuarios } from '../../src/application/puertos/lector-usuarios.js';
import {
  aUsuarioVista,
  UsuarioVista,
} from '../../src/application/vistas/usuario-vista.js';
import { IdUsuario } from '../../src/domain/cuenta-usuario/id-usuario.js';
import { RepositorioCuentasUsuarioEnMemoria } from './repositorio-cuentas-usuario-en-memoria.js';

/** Doble del lado de lectura: lee las mismas cuentas que el repositorio en memoria. */
export class LectorUsuariosEnMemoria implements LectorUsuarios {
  constructor(
    private readonly repositorio: RepositorioCuentasUsuarioEnMemoria,
  ) {}

  obtenerPorId(id: IdUsuario): Promise<UsuarioVista | null> {
    const cuenta = this.repositorio.porId(id);
    return Promise.resolve(cuenta ? aUsuarioVista(cuenta) : null);
  }
}
