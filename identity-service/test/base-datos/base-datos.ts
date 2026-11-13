import { ConfigService } from '@nestjs/config';
import { inject } from 'vitest';
import { PrismaServicio } from '../../src/infrastructure/persistencia/prisma.servicio.js';

/** Un PrismaServicio conectado a la base de las pruebas de integración. */
export function crearPrisma(): PrismaServicio {
  return new PrismaServicio(
    new ConfigService({ DATABASE_URL: inject('urlBaseDatos') }),
  );
}

/** Deja las tablas vacías, para que cada prueba empiece desde cero. */
export async function vaciarTablas(prisma: PrismaServicio): Promise<void> {
  await prisma.$executeRaw`TRUNCATE TABLE cuentas_usuario, eventos_salida`;
}
