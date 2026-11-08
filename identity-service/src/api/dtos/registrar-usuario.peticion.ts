import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

const MENSAJE_TEXTO = 'Es obligatorio y debe ser un texto.';

/**
 * Cuerpo de `POST /api/identidad/usuarios`.
 *
 * Aquí solo se valida la forma: que estén los tres campos, que sean texto y que
 * no sobre ninguno (por ejemplo, un `rol`, que el registro público no acepta: R6).
 * El formato del correo y los largos los valida el dominio (R1, R3 y R4), que es
 * el único lugar donde viven esas reglas.
 */
export class RegistrarUsuarioPeticion {
  @ApiProperty({
    description:
      'Nombre visible. Entre 2 y 100 caracteres, sin contar los espacios de los extremos (R3).',
    example: 'Ana Pérez',
  })
  @IsString({ message: MENSAJE_TEXTO })
  nombre: string;

  @ApiProperty({
    description:
      'Correo de la cuenta. Hasta 254 caracteres; se guarda en minúsculas (R1). No puede estar registrado (R2).',
    example: 'ana@example.org',
    format: 'email',
  })
  @IsString({ message: MENSAJE_TEXTO })
  correo: string;

  @ApiProperty({
    description:
      'Entre 8 y 128 caracteres (R4). Se guarda solo su hash argon2id (R5).',
    example: 'una frase larga y secreta',
    format: 'password',
  })
  @IsString({ message: MENSAJE_TEXTO })
  contrasena: string;
}
