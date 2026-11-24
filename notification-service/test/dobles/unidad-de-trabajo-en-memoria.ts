import type {
  EventoDeCampanaConocida,
  EventoIntegracion,
} from '../../src/application/eventos/evento-integracion.js';
import type {
  Transaccion,
  UnidadDeTrabajo,
} from '../../src/application/puertos/unidad-de-trabajo.js';
import type { Aviso } from '../../src/domain/aviso/aviso.js';
import type { CorreoPorEnviar } from '../../src/domain/aviso/repositorio-avisos.js';
import { CampanaSeguida } from '../../src/domain/campana/campana-seguida.js';
import type { Contacto } from '../../src/domain/contacto/contacto.js';
import type { IdAviso } from '../../src/domain/identificadores/id-aviso.js';
import type { IdCampana } from '../../src/domain/identificadores/id-campana.js';
import type { IdUsuario } from '../../src/domain/identificadores/id-usuario.js';

interface EnEspera {
  evento: EventoDeCampanaConocida;
  idCampana: string;
}

/**
 * Unidad de trabajo en memoria. Si el trabajo falla, todo vuelve a como estaba,
 * igual que una transacción.
 */
export class UnidadDeTrabajoEnMemoria implements UnidadDeTrabajo {
  contactos = new Map<string, Contacto>();
  campanas = new Map<string, CampanaSeguida>();
  avisos = new Map<string, Aviso>();
  procesados = new Set<string>();
  enEspera: EnEspera[] = [];
  /** Las campañas bloqueadas, en orden. */
  readonly bloqueos: string[] = [];
  /** Para probar un fallo de la base al guardar los avisos. */
  fallarAlAgregarAvisos: Error | null = null;

  async ejecutar<T>(trabajo: (t: Transaccion) => Promise<T>): Promise<T> {
    const antes = {
      contactos: new Map(this.contactos),
      campanas: new Map(this.campanas),
      avisos: new Map(this.avisos),
      procesados: new Set(this.procesados),
      enEspera: [...this.enEspera],
    };
    try {
      return await trabajo(this.transaccion());
    } catch (error) {
      Object.assign(this, antes);
      throw error;
    }
  }

  avisosDe(idUsuario: string): Aviso[] {
    return [...this.avisos.values()].filter(
      (aviso) => aviso.idDestinatario.valor === idUsuario,
    );
  }

  private transaccion(): Transaccion {
    return {
      contactos: {
        guardar: (contacto) => {
          this.contactos.set(contacto.idUsuario.valor, contacto);
          return Promise.resolve();
        },
      },
      campanas: {
        bloquear: (id: IdCampana) => {
          this.bloqueos.push(id.valor);
          return Promise.resolve();
        },
        // Una copia, como la que daría la base: los cambios sin guardar se pierden.
        buscar: (id: IdCampana) => {
          const campana = this.campanas.get(id.valor);
          return Promise.resolve(
            campana === undefined
              ? null
              : CampanaSeguida.reconstituir(campana, campana.aportantes),
          );
        },
        guardar: (campana) => {
          this.campanas.set(campana.id.valor, campana);
          return Promise.resolve();
        },
      },
      avisos: {
        agregar: (avisos) => {
          if (this.fallarAlAgregarAvisos) {
            return Promise.reject(this.fallarAlAgregarAvisos);
          }
          for (const aviso of avisos) {
            const repetido = [...this.avisos.values()].some(
              (otro) =>
                otro.idEvento === aviso.idEvento &&
                otro.idDestinatario.esIgualA(aviso.idDestinatario),
            );
            if (!repetido) {
              this.avisos.set(aviso.id.valor, aviso);
            }
          }
          return Promise.resolve();
        },
        buscarDe: (idDestinatario: IdUsuario, id: IdAviso) => {
          const aviso = this.avisos.get(id.valor);
          return Promise.resolve(
            aviso?.idDestinatario.esIgualA(idDestinatario) ? aviso : null,
          );
        },
        guardarLectura: () => Promise.resolve(),
        marcarTodosLeidos: (idDestinatario, ahora) => {
          for (const aviso of this.avisosDe(idDestinatario.valor)) {
            aviso.marcarLeido(ahora);
          }
          return Promise.resolve();
        },
        reservarPorEnviar: (limite, ahora, hasta) => {
          const reservados: CorreoPorEnviar[] = [];
          for (const aviso of this.avisos.values()) {
            const contacto = this.contactos.get(aviso.idDestinatario.valor);
            const { estado, proximoIntentoEn } = aviso.envio.datos;
            if (
              contacto !== undefined &&
              estado === 'PENDIENTE' &&
              proximoIntentoEn <= ahora &&
              reservados.length < limite
            ) {
              aviso.posponerEnvio(hasta);
              reservados.push({ aviso, correo: contacto.correo });
            }
          }
          return Promise.resolve(reservados);
        },
        guardarEnvio: () => Promise.resolve(),
      },
      eventos: {
        registrarProcesado: (evento: EventoIntegracion) => {
          if (this.procesados.has(evento.idEvento)) {
            return Promise.resolve(false);
          }
          this.procesados.add(evento.idEvento);
          return Promise.resolve(true);
        },
        dejarEnEspera: (evento, idCampana) => {
          this.enEspera.push({ evento, idCampana: idCampana.valor });
          return Promise.resolve();
        },
        extraerEnEspera: (idCampana) => {
          const suyos = this.enEspera.filter(
            (espera) => espera.idCampana === idCampana.valor,
          );
          this.enEspera = this.enEspera.filter(
            (espera) => espera.idCampana !== idCampana.valor,
          );
          return Promise.resolve(
            suyos
              .map((espera) => espera.evento)
              .sort((a, b) => a.ocurridoEn.getTime() - b.ocurridoEn.getTime()),
          );
        },
      },
    };
  }
}
