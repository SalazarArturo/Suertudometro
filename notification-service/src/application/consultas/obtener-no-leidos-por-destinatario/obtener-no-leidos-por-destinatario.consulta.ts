import { Query } from '@nestjs/cqrs';

/** Cuántos avisos sin leer tiene una persona. */
export class ObtenerNoLeidosPorDestinatarioConsulta extends Query<number> {
  constructor(readonly idDestinatario: string) {
    super();
  }
}
