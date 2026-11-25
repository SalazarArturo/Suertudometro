import { Injectable } from '@nestjs/common';
import type {
  Transaccion,
  UnidadDeTrabajo,
} from '../../application/puertos/unidad-de-trabajo.js';
import { PrismaServicio } from './prisma.servicio.js';
import { RegistroEventosPrisma } from './registro-eventos.prisma.js';
import { RepositorioAvisosPrisma } from './repositorio-avisos.prisma.js';
import { RepositorioCampanasPrisma } from './repositorio-campanas.prisma.js';
import { RepositorioContactosPrisma } from './repositorio-contactos.prisma.js';

/** Los repositorios de cada trabajo comparten una transacción de Prisma. */
@Injectable()
export class UnidadDeTrabajoPrisma implements UnidadDeTrabajo {
  constructor(private readonly prisma: PrismaServicio) {}

  ejecutar<T>(trabajo: (transaccion: Transaccion) => Promise<T>): Promise<T> {
    return this.prisma.$transaction(
      (tx) =>
        trabajo({
          contactos: new RepositorioContactosPrisma(tx),
          campanas: new RepositorioCampanasPrisma(tx),
          avisos: new RepositorioAvisosPrisma(tx),
          eventos: new RegistroEventosPrisma(tx),
        }),
      { maxWait: 5_000, timeout: 15_000 },
    );
  }
}
