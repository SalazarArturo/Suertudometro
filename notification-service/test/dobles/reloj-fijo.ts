import { Reloj } from '../../src/application/puertos/reloj.js';

/** Reloj detenido en un instante conocido, para que las fechas sean predecibles. */
export class RelojFijo implements Reloj {
  constructor(private instante = new Date('2026-11-07T14:00:00.000Z')) {}

  ahora(): Date {
    return new Date(this.instante.getTime());
  }

  avanzarMinutos(minutos: number): void {
    this.instante = new Date(this.instante.getTime() + minutos * 60_000);
  }
}
