import type { Papel } from '../aviso/contenido-aviso.js';
import type { IdCampana } from '../identificadores/id-campana.js';
import type { IdUsuario } from '../identificadores/id-usuario.js';

export interface Aportante {
  readonly idUsuario: IdUsuario;
  readonly vinculadoEn: Date;
}

export interface DatosCampanaSeguida {
  readonly id: IdCampana;
  readonly idOrganizador: IdUsuario;
  readonly titulo: string;
  readonly publicadaEn: Date;
}

export interface Destinatario {
  readonly idUsuario: IdUsuario;
  readonly papel: Papel;
}

/**
 * Lo mínimo de una campaña publicada para saber a quién avisar. No replica su
 * estado ni sus montos: de eso se ocupa campaign-service.
 */
export class CampanaSeguida {
  readonly id: IdCampana;
  readonly idOrganizador: IdUsuario;
  readonly titulo: string;
  readonly publicadaEn: Date;
  readonly #aportantes: Map<string, Aportante>;

  private constructor(
    datos: DatosCampanaSeguida,
    aportantes: readonly Aportante[],
  ) {
    this.id = datos.id;
    this.idOrganizador = datos.idOrganizador;
    this.titulo = datos.titulo;
    this.publicadaEn = datos.publicadaEn;
    this.#aportantes = new Map(
      aportantes.map((aportante) => [aportante.idUsuario.valor, aportante]),
    );
  }

  static publicar(datos: DatosCampanaSeguida): CampanaSeguida {
    return new CampanaSeguida(datos, []);
  }

  static reconstituir(
    datos: DatosCampanaSeguida,
    aportantes: readonly Aportante[],
  ): CampanaSeguida {
    return new CampanaSeguida(datos, aportantes);
  }

  get aportantes(): readonly Aportante[] {
    return [...this.#aportantes.values()];
  }

  /**
   * R3: quien aporta queda vinculado en privado, también si aportó como
   * anónimo. Un segundo aporte no cambia el vínculo.
   */
  vincularAportante(idUsuario: IdUsuario, ahora: Date): void {
    if (!this.#aportantes.has(idUsuario.valor)) {
      this.#aportantes.set(idUsuario.valor, { idUsuario, vinculadoEn: ahora });
    }
  }

  /** R4: los aportantes, sin quien organiza, que es quien escribió la novedad. */
  destinatariosDeNovedades(): readonly IdUsuario[] {
    return this.aportantes
      .map((aportante) => aportante.idUsuario)
      .filter((idUsuario) => !idUsuario.esIgualA(this.idOrganizador));
  }

  /** El organizador y los aportantes, sin repetir a quien es las dos cosas (R4). */
  destinatariosDelResultado(): readonly Destinatario[] {
    return [
      { idUsuario: this.idOrganizador, papel: 'ORGANIZADOR' },
      ...this.destinatariosDeNovedades().map((idUsuario): Destinatario => ({
        idUsuario,
        papel: 'APORTANTE',
      })),
    ];
  }
}
