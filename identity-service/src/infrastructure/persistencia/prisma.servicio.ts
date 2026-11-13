import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma/generado/client.js';

/**
 * Cliente de Prisma para identity-db. Hay una sola instancia por proceso,
 * porque cada cliente abre su propio pool de conexiones.
 * Prisma 7 se conecta a PostgreSQL con el driver `pg`, mediante un adapter.
 */
@Injectable()
export class PrismaServicio extends PrismaClient implements OnModuleDestroy {
  constructor(configuracion: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configuracion.getOrThrow<string>('DATABASE_URL'),
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
