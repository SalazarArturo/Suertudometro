import { ApiProperty } from '@nestjs/swagger';
import type { AvisoVista } from '../../application/vistas/aviso-vista.js';
import type { Pagina } from '../../application/vistas/pagina.js';
import { AvisoRespuesta } from './aviso.respuesta.js';

/** El mismo formato de página que contribution-service. */
export class PaginaAvisosRespuesta {
  @ApiProperty({ type: [AvisoRespuesta] })
  elementos: AvisoRespuesta[];

  @ApiProperty({ example: 1 })
  pagina: number;

  @ApiProperty({ example: 20 })
  tamano: number;

  @ApiProperty({ example: 1 })
  totalElementos: number;

  @ApiProperty({ example: 1 })
  totalPaginas: number;

  static desde(pagina: Pagina<AvisoVista>): PaginaAvisosRespuesta {
    return {
      elementos: pagina.elementos.map((vista) => AvisoRespuesta.desde(vista)),
      pagina: pagina.pagina,
      tamano: pagina.tamano,
      totalElementos: pagina.totalElementos,
      totalPaginas: Math.ceil(pagina.totalElementos / pagina.tamano),
    };
  }
}
