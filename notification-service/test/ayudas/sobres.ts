import type { EventoIntegracion } from '../../src/application/eventos/evento-integracion.js';

/** El mensaje que pondría en el bus el servicio que publica el evento. */
export function aSobre(evento: EventoIntegracion): object {
  return {
    idEvento: evento.idEvento,
    tipoEvento: evento.tipo,
    version: 1,
    ocurridoEn: evento.ocurridoEn.toISOString(),
    datos: evento.datos,
  };
}
