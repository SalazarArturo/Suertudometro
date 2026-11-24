import { Injectable } from '@nestjs/common';
import type {
  FiltroAvisos,
  LectorAvisos,
} from '../../application/puertos/lector-avisos.js';
import { redactarAviso } from '../../application/redaccion/redactar-aviso.js';
import type { AvisoVista } from '../../application/vistas/aviso-vista.js';
import type { Pagina } from '../../application/vistas/pagina.js';
import type { IdUsuario } from '../../domain/identificadores/id-usuario.js';
import { contenidoADominio } from './aviso.mapper.js';
import { PrismaServicio } from './prisma.servicio.js';
import type { AvisoFila } from './prisma/generado/client.js';

@Injectable()
export class LectorAvisosPrisma implements LectorAvisos {
  constructor(private readonly prisma: PrismaServicio) {}

  async listar(
    idDestinatario: IdUsuario,
    { pagina, tamano, soloNoLeidos }: FiltroAvisos,
  ): Promise<Pagina<AvisoVista>> {
    const where = {
      idDestinatario: idDestinatario.valor,
      ...(soloNoLeidos && { leidoEn: null }),
    };
    const [filas, totalElementos] = await this.prisma.$transaction([
      this.prisma.avisoFila.findMany({
        where,
        orderBy: [{ ocurridoEn: 'desc' }, { idAviso: 'desc' }],
        skip: (pagina - 1) * tamano,
        take: tamano,
      }),
      this.prisma.avisoFila.count({ where }),
    ]);
    return { elementos: filas.map(aVista), pagina, tamano, totalElementos };
  }

  contarNoLeidos(idDestinatario: IdUsuario): Promise<number> {
    return this.prisma.avisoFila.count({
      where: { idDestinatario: idDestinatario.valor, leidoEn: null },
    });
  }
}

function aVista(fila: AvisoFila): AvisoVista {
  const contenido = contenidoADominio(fila.contenido);
  return {
    id: fila.idAviso,
    tipo: contenido.tipo,
    ...redactarAviso(contenido),
    idCampana: fila.idCampana,
    leido: fila.leidoEn !== null,
    ocurridoEn: fila.ocurridoEn,
  };
}
