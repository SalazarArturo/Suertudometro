import type { Aviso } from '../../domain/aviso/aviso.js';
import type {
  CorreoPorEnviar,
  RepositorioAvisos,
} from '../../domain/aviso/repositorio-avisos.js';
import { Correo } from '../../domain/contacto/correo.js';
import type { IdAviso } from '../../domain/identificadores/id-aviso.js';
import type { IdUsuario } from '../../domain/identificadores/id-usuario.js';
import { avisoADominio, avisoAFila, envioAFila } from './aviso.mapper.js';
import type { Prisma } from './prisma/generado/client.js';

interface FilaReservada {
  id_aviso: string;
  correo: string;
}

export class RepositorioAvisosPrisma implements RepositorioAvisos {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  /** El índice único (evento, destinatario) respalda R1. */
  async agregar(avisos: readonly Aviso[]): Promise<void> {
    await this.tx.avisoFila.createMany({
      data: avisos.map(avisoAFila),
      skipDuplicates: true,
    });
  }

  async buscarDe(
    idDestinatario: IdUsuario,
    id: IdAviso,
  ): Promise<Aviso | null> {
    const fila = await this.tx.avisoFila.findFirst({
      where: { idAviso: id.valor, idDestinatario: idDestinatario.valor },
    });
    return fila === null ? null : avisoADominio(fila);
  }

  /** Solo si seguía sin leer: dos marcas a la vez conservan la primera (R7). */
  async guardarLectura(aviso: Aviso): Promise<void> {
    await this.tx.avisoFila.updateMany({
      where: { idAviso: aviso.id.valor, leidoEn: null },
      data: { leidoEn: aviso.leidoEn },
    });
  }

  async marcarTodosLeidos(
    idDestinatario: IdUsuario,
    ahora: Date,
  ): Promise<void> {
    await this.tx.avisoFila.updateMany({
      where: { idDestinatario: idDestinatario.valor, leidoEn: null },
      data: { leidoEn: ahora },
    });
  }

  async reservarPorEnviar(
    limite: number,
    ahora: Date,
    reservadosHasta: Date,
  ): Promise<readonly CorreoPorEnviar[]> {
    const reservados = await this.tx.$queryRaw<FilaReservada[]>`
      SELECT a.id_aviso, c.correo
      FROM avisos a
      JOIN contactos c ON c.id_usuario = a.id_destinatario
      WHERE a.envio_estado = 'PENDIENTE' AND a.envio_proximo_en <= ${ahora.toISOString()}::timestamptz
      ORDER BY a.envio_proximo_en, a.ocurrido_en, a.id_aviso
      LIMIT ${limite}
      FOR UPDATE OF a SKIP LOCKED`;
    if (reservados.length === 0) {
      return [];
    }
    const ids = reservados.map((fila) => fila.id_aviso);
    await this.tx.avisoFila.updateMany({
      where: { idAviso: { in: ids } },
      data: { envioProximoEn: reservadosHasta },
    });
    const filas = await this.tx.avisoFila.findMany({
      where: { idAviso: { in: ids } },
    });
    const porId = new Map(filas.map((fila) => [fila.idAviso, fila]));
    return reservados.flatMap(({ id_aviso, correo }) => {
      const fila = porId.get(id_aviso);
      return fila === undefined
        ? []
        : [{ aviso: avisoADominio(fila), correo: Correo.de(correo) }];
    });
  }

  async guardarEnvio(aviso: Aviso): Promise<void> {
    await this.tx.avisoFila.update({
      where: { idAviso: aviso.id.valor },
      data: envioAFila(aviso),
    });
  }
}
