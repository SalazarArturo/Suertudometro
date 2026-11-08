import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

const MENSAJE_TEXTO = 'Es obligatorio y debe ser un texto.';

/** Cuerpo de `POST /api/identidad/sesiones`. Solo se valida la forma. */
export class IniciarSesionPeticion {
  @ApiProperty({
    description: 'Correo de la cuenta; no distingue mayúsculas.',
    example: 'ana@example.org',
    format: 'email',
  })
  @IsString({ message: MENSAJE_TEXTO })
  correo: string;

  @ApiProperty({ example: 'una frase larga y secreta', format: 'password' })
  @IsString({ message: MENSAJE_TEXTO })
  contrasena: string;
}
