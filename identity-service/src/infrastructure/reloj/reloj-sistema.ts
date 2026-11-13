import { Injectable } from '@nestjs/common';
import { Reloj } from '../../application/puertos/reloj.js';

/** La hora del sistema. `Date` guarda el instante en UTC. */
@Injectable()
export class RelojSistema implements Reloj {
  ahora(): Date {
    return new Date();
  }
}
