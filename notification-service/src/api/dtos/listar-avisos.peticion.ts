import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsInt, Max, Min } from 'class-validator';

/** Tope de páginas: evita desplazamientos absurdos en la base. */
const PAGINA_MAXIMA = 100_000;

export class ListarAvisosPeticion {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(1, { message: 'Debe ser 1 o más.' })
  @Max(PAGINA_MAXIMA, { message: `No puede pasar de ${PAGINA_MAXIMA}.` })
  pagina: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @Type(() => Number)
  @IsInt({ message: 'Debe ser un número entero.' })
  @Min(1, { message: 'Debe ser 1 o más.' })
  @Max(100, { message: 'No puede pasar de 100.' })
  tamano: number = 20;

  @ApiPropertyOptional({ default: false })
  // "true" y "false" son los únicos textos válidos: cualquier otro no es booleano.
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean({ message: 'Debe ser true o false.' })
  soloNoLeidos: boolean = false;
}
