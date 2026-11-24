import { ApiProperty } from '@nestjs/swagger';
import {
  TIPOS_AVISO,
  type AvisoVista,
} from '../../application/vistas/aviso-vista.js';

/** Un aviso de la bandeja. */
export class AvisoRespuesta {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: TIPOS_AVISO, example: 'APORTE_RECIBIDO' })
  tipo: AvisoVista['tipo'];

  @ApiProperty({ example: 'Recibiste un aporte de Bs 150,00' })
  titulo: string;

  @ApiProperty({
    example: 'Ana Pérez aportó Bs 150,00 a «Libros para la biblioteca».',
  })
  mensaje: string;

  @ApiProperty({ format: 'uuid' })
  idCampana: string;

  @ApiProperty({ example: false })
  leido: boolean;

  @ApiProperty({ format: 'date-time', example: '2026-11-24T15:30:00.000Z' })
  ocurridoEn: string;

  static desde(vista: AvisoVista): AvisoRespuesta {
    return {
      id: vista.id,
      tipo: vista.tipo,
      titulo: vista.titulo,
      mensaje: vista.mensaje,
      idCampana: vista.idCampana,
      leido: vista.leido,
      ocurridoEn: vista.ocurridoEn.toISOString(),
    };
  }
}
