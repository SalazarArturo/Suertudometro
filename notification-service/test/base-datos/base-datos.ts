import { ConfigService } from '@nestjs/config';
import { inject } from 'vitest';
import { PrismaServicio } from '../../src/infrastructure/persistencia/prisma.servicio.js';

/** Un PrismaServicio conectado a la base de las pruebas. */
export function crearPrisma(url = inject('urlBaseDatos')): PrismaServicio {
  return new PrismaServicio(new ConfigService({ DATABASE_URL: url }));
}

/** Deja las tablas vacías, para que cada prueba empiece desde cero. */
export async function vaciarTablas(prisma: PrismaServicio): Promise<void> {
  await prisma.$executeRaw`TRUNCATE TABLE contactos, campanas, aportantes_campana, avisos, eventos_procesados, eventos_en_espera`;
}
