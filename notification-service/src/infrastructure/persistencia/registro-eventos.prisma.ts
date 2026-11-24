import type {
  EventoDeCampanaConocida,
  EventoIntegracion,
} from '../../application/eventos/evento-integracion.js';
import type { RegistroEventos } from '../../application/puertos/registro-eventos.js';
import type { IdCampana } from '../../domain/identificadores/id-campana.js';
import { datosAFila, eventoADominio } from './evento-en-espera.mapper.js';
import type { Prisma } from './prisma/generado/client.js';

export class RegistroEventosPrisma implements RegistroEventos {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  async registrarProcesado(
    evento: EventoIntegracion,
    ahora: Date,
  ): Promise<boolean> {
    const { count } = await this.tx.eventoProcesadoFila.createMany({
      data: {
        idEvento: evento.idEvento,
        tipoEvento: evento.tipo,
        procesadoEn: ahora,
      },
      skipDuplicates: true,
    });
    return count === 1;
  }

  async dejarEnEspera(
    evento: EventoDeCampanaConocida,
    idCampana: IdCampana,
    ahora: Date,
  ): Promise<void> {
    await this.tx.eventoEnEsperaFila.create({
      data: {
        idEvento: evento.idEvento,
        idCampana: idCampana.valor,
        tipoEvento: evento.tipo,
        ocurridoEn: evento.ocurridoEn,
        contenido: datosAFila(evento),
        recibidoEn: ahora,
      },
    });
  }

  async extraerEnEspera(
    idCampana: IdCampana,
  ): Promise<readonly EventoDeCampanaConocida[]> {
    const where = { idCampana: idCampana.valor };
    const filas = await this.tx.eventoEnEsperaFila.findMany({
      where,
      orderBy: [{ ocurridoEn: 'asc' }, { recibidoEn: 'asc' }],
    });
    await this.tx.eventoEnEsperaFila.deleteMany({ where });
    return filas.map(eventoADominio);
  }
}
