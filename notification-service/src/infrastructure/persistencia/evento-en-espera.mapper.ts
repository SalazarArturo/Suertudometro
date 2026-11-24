import type { EventoDeCampanaConocida } from '../../application/eventos/evento-integracion.js';
import type { EventoEnEsperaFila, Prisma } from './prisma/generado/client.js';

/** En la base se guardan solo los `datos`: lo demás tiene su columna. */
export function datosAFila(
  evento: EventoDeCampanaConocida,
): Prisma.InputJsonObject {
  return { ...evento.datos };
}

/** Los datos ya se validaron al recibir el mensaje (lector-de-mensajes). */
export function eventoADominio(
  fila: EventoEnEsperaFila,
): EventoDeCampanaConocida {
  return {
    idEvento: fila.idEvento,
    tipo: fila.tipoEvento,
    ocurridoEn: fila.ocurridoEn,
    datos: fila.contenido,
  } as unknown as EventoDeCampanaConocida;
}
