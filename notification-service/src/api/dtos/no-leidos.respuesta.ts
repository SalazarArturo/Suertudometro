import { ApiProperty } from '@nestjs/swagger';

export class NoLeidosRespuesta {
  @ApiProperty({ example: 3 })
  cantidad: number;
}
