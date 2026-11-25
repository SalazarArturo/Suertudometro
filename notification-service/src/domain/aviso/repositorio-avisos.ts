import type { Correo } from '../contacto/correo.js';
import type { IdAviso } from '../identificadores/id-aviso.js';
import type { IdUsuario } from '../identificadores/id-usuario.js';
import type { Aviso } from './aviso.js';

/** Un aviso cuyo correo toca enviar, con el correo de su destinatario. */
export interface CorreoPorEnviar {
  readonly aviso: Aviso;
  readonly correo: Correo;
}

export interface RepositorioAvisos {
  /** R1: si ya había un aviso del mismo evento para la misma persona, se ignora. */
  agregar(avisos: readonly Aviso[]): Promise<void>;

  /** Solo lo encuentra si es de esa persona (R7). */
  buscarDe(idDestinatario: IdUsuario, id: IdAviso): Promise<Aviso | null>;

  guardarLectura(aviso: Aviso): Promise<void>;

  marcarTodosLeidos(idDestinatario: IdUsuario, ahora: Date): Promise<void>;

  /**
   * Toma hasta `limite` avisos pendientes cuyo destinatario tiene contacto (R8)
   * y los reserva hasta `reservadosHasta`, para que nadie más los envíe.
   */
  reservarPorEnviar(
    limite: number,
    ahora: Date,
    reservadosHasta: Date,
  ): Promise<readonly CorreoPorEnviar[]>;

  guardarEnvio(aviso: Aviso): Promise<void>;
}
