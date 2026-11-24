import { CampanaSeguida } from '../../domain/campana/campana-seguida.js';
import type { RepositorioCampanas } from '../../domain/campana/repositorio-campanas.js';
import { IdCampana } from '../../domain/identificadores/id-campana.js';
import { IdUsuario } from '../../domain/identificadores/id-usuario.js';
import type { Prisma } from './prisma/generado/client.js';

export class RepositorioCampanasPrisma implements RepositorioCampanas {
  constructor(private readonly tx: Prisma.TransactionClient) {}

  /** Bloqueo consultivo: sirve aunque la campaña todavía no tenga fila. */
  async bloquear(id: IdCampana): Promise<void> {
    await this.tx
      .$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id.valor}, 0))`;
  }

  async buscar(id: IdCampana): Promise<CampanaSeguida | null> {
    const fila = await this.tx.campanaFila.findUnique({
      where: { idCampana: id.valor },
      include: { aportantes: { orderBy: { vinculadoEn: 'asc' } } },
    });
    if (fila === null) {
      return null;
    }
    return CampanaSeguida.reconstituir(
      {
        id,
        idOrganizador: IdUsuario.de(fila.idOrganizador),
        titulo: fila.titulo,
        publicadaEn: fila.publicadaEn,
      },
      fila.aportantes.map((aportante) => ({
        idUsuario: IdUsuario.de(aportante.idUsuario),
        vinculadoEn: aportante.vinculadoEn,
      })),
    );
  }

  /** Los datos de la campaña no cambian; los vínculos solo se agregan. */
  async guardar(campana: CampanaSeguida): Promise<void> {
    const idCampana = campana.id.valor;
    await this.tx.campanaFila.createMany({
      data: {
        idCampana,
        idOrganizador: campana.idOrganizador.valor,
        titulo: campana.titulo,
        publicadaEn: campana.publicadaEn,
      },
      skipDuplicates: true,
    });
    await this.tx.aportanteCampanaFila.createMany({
      data: campana.aportantes.map((aportante) => ({
        idCampana,
        idUsuario: aportante.idUsuario.valor,
        vinculadoEn: aportante.vinculadoEn,
      })),
      skipDuplicates: true,
    });
  }
}
