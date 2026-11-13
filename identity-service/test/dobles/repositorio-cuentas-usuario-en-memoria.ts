import {
  CuentaUsuario,
  DatosCuentaUsuario,
} from '../../src/domain/cuenta-usuario/cuenta-usuario.js';
import { Correo } from '../../src/domain/cuenta-usuario/correo.js';
import { IdUsuario } from '../../src/domain/cuenta-usuario/id-usuario.js';
import { CorreoDebeSerUnico } from '../../src/domain/cuenta-usuario/reglas/correo-debe-ser-unico.js';
import { RepositorioCuentasUsuario } from '../../src/domain/cuenta-usuario/repositorio-cuentas-usuario.js';
import { EventoDeDominio } from '../../src/sharedkernel/evento-de-dominio.js';
import { ReglaDeNegocioIncumplida } from '../../src/sharedkernel/regla-de-negocio.js';

/**
 * Doble del repositorio para las pruebas unitarias. Se comporta como el real en
 * lo que importa: guarda copias (no la misma instancia), respeta la unicidad
 * del correo y deja en `eventosGuardados` lo que el real escribiría en el outbox.
 */
export class RepositorioCuentasUsuarioEnMemoria implements RepositorioCuentasUsuario {
  private readonly filas = new Map<string, DatosCuentaUsuario>();

  /** Eventos que el repositorio real guardaría en eventos_salida, en orden. */
  readonly eventosGuardados: EventoDeDominio[] = [];

  buscarPorCorreo(correo: Correo): Promise<CuentaUsuario | null> {
    const fila = this.buscarFila((f) => f.correo.esIgualA(correo));
    return Promise.resolve(fila ? CuentaUsuario.reconstituir(fila) : null);
  }

  existeConCorreo(correo: Correo): Promise<boolean> {
    return Promise.resolve(
      this.buscarFila((f) => f.correo.esIgualA(correo)) !== undefined,
    );
  }

  guardar(cuenta: CuentaUsuario): Promise<void> {
    const otraConElMismoCorreo = this.buscarFila(
      (f) => f.correo.esIgualA(cuenta.correo) && !f.id.esIgualA(cuenta.id),
    );
    if (otraConElMismoCorreo) {
      return Promise.reject(
        new ReglaDeNegocioIncumplida(new CorreoDebeSerUnico(true)),
      );
    }
    this.filas.set(cuenta.id.valor, aFila(cuenta));
    this.eventosGuardados.push(...cuenta.extraerEventos());
    return Promise.resolve();
  }

  /** Deja una cuenta ya guardada, sin pasar por guardar() ni registrar eventos. */
  agregar(cuenta: CuentaUsuario): void {
    this.filas.set(cuenta.id.valor, aFila(cuenta));
  }

  /** Copias de todas las cuentas guardadas. */
  cuentas(): CuentaUsuario[] {
    return [...this.filas.values()].map((f) => CuentaUsuario.reconstituir(f));
  }

  porId(id: IdUsuario): CuentaUsuario | null {
    const fila = this.filas.get(id.valor);
    return fila ? CuentaUsuario.reconstituir(fila) : null;
  }

  private buscarFila(
    criterio: (fila: DatosCuentaUsuario) => boolean,
  ): DatosCuentaUsuario | undefined {
    return [...this.filas.values()].find(criterio);
  }
}

function aFila(cuenta: CuentaUsuario): DatosCuentaUsuario {
  return {
    id: cuenta.id,
    correo: cuenta.correo,
    nombre: cuenta.nombre,
    hashContrasena: cuenta.hashContrasena,
    rol: cuenta.rol,
    registradoEn: new Date(cuenta.registradoEn.getTime()),
    ultimoInicioSesionEn: cuenta.ultimoInicioSesionEn
      ? new Date(cuenta.ultimoInicioSesionEn.getTime())
      : null,
  };
}
