import { execFileSync } from 'node:child_process';
import path from 'node:path';

const raiz = path.resolve(import.meta.dirname, '../..');
const cli = path.join(raiz, 'node_modules', 'prisma', 'build', 'index.js');

/**
 * Ejecuta la CLI de Prisma contra la base indicada. Si el comando termina con
 * un código distinto de 0, lanza un error con su salida.
 */
export function ejecutarPrisma(
  argumentos: string[],
  urlBaseDatos: string,
): string {
  return execFileSync(process.execPath, [cli, ...argumentos], {
    cwd: raiz,
    env: { ...process.env, DATABASE_URL: urlBaseDatos },
    encoding: 'utf8',
    stdio: 'pipe',
  });
}
