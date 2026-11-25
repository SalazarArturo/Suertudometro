import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './prisma/generado/client.js';

/**
 * Cliente de Prisma para notification-db. Hay una sola instancia por proceso,
 * porque cada cliente abre su propio pool de conexiones.
 */
@Injectable()
export class PrismaServicio extends PrismaClient implements OnModuleDestroy {
  constructor(configuracion: ConfigService) {
    super({
      adapter: new PrismaPg({
        connectionString: configuracion.getOrThrow<string>('DATABASE_URL'),
        // Prisma manda las fechas sin zona: si la sesión no está en UTC, las
        // guardaría corridas, aunque la columna sea TIMESTAMPTZ.
        options: '-c TimeZone=UTC',
      }),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
