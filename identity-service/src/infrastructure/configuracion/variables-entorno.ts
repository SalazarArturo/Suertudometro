import { plainToInstance } from 'class-transformer';
import {
  IsByteLength,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

export enum Entorno {
  Desarrollo = 'development',
  Prueba = 'test',
  Produccion = 'production',
}

/**
 * Variables de entorno del servicio. Se validan al arrancar: si falta una
 * o tiene un valor inválido, el servicio no levanta.
 */
export class VariablesEntorno {
  @IsEnum(Entorno)
  NODE_ENV: Entorno = Entorno.Desarrollo;

  /** Puerto interno del contenedor (docs/diagramas/despliegue.excalidraw). */
  @IsInt()
  @Min(1)
  @Max(65535)
  PUERTO: number = 8081;

  /** Conexión a identity-db. No tiene valor por defecto: es obligatoria. */
  @Matches(/^postgres(ql)?:\/\/\S+$/, {
    message: 'DATABASE_URL debe ser una URL de PostgreSQL (postgresql://...)',
  })
  DATABASE_URL: string;

  /**
   * Secreto HS256 del JWT. Lo comparten identity-service y api-gateway
   * (docs/servicios/identity-service.md §5.1). Mínimo 32 bytes, el largo de la
   * firma de HS256.
   */
  @IsByteLength(32, undefined, {
    message: 'JWT_SECRETO debe tener al menos 32 bytes',
  })
  JWT_SECRETO: string;

  /** Cuánto dura el token, en segundos. No hay refresh token. */
  @IsInt({ message: 'JWT_DURACION debe ser un número entero de segundos' })
  @Min(60, { message: 'JWT_DURACION debe ser de al menos 60 segundos' })
  @Max(86_400, {
    message: 'JWT_DURACION no puede pasar de 86400 segundos (1 día)',
  })
  JWT_DURACION: number = 3600;

  /**
   * Correo y contraseña del primer administrador, que se crea al arrancar.
   * Aquí solo se exige que estén: el formato y los largos los valida el
   * dominio al sembrarlo (R1 y R4), y si no se cumplen, el servicio no levanta.
   */
  @IsNotEmpty({ message: 'ADMIN_CORREO es obligatoria' })
  ADMIN_CORREO: string;

  @IsNotEmpty({ message: 'ADMIN_CONTRASENA es obligatoria' })
  ADMIN_CONTRASENA: string;

  /**
   * Conexión a RabbitMQ (docs/rabbitmq.md §1). Es opcional: sin ella, el
   * servicio funciona igual y los eventos esperan en el outbox. En Docker
   * Compose siempre está.
   */
  @IsOptional()
  @Matches(/^amqps?:\/\/\S+$/, {
    message: 'RABBITMQ_URL debe ser una URL de RabbitMQ (amqp://...)',
  })
  RABBITMQ_URL?: string;

  /** Cada cuántos milisegundos el publicador revisa el outbox. */
  @IsInt({ message: 'OUTBOX_INTERVALO_MS debe ser un número entero' })
  @Min(100, { message: 'OUTBOX_INTERVALO_MS debe ser de al menos 100 ms' })
  @Max(60_000, {
    message: 'OUTBOX_INTERVALO_MS no puede pasar de 60000 ms (1 minuto)',
  })
  OUTBOX_INTERVALO_MS: number = 2000;
}

export function validarVariablesEntorno(
  configuracion: Record<string, unknown>,
): VariablesEntorno {
  const variables = plainToInstance(VariablesEntorno, configuracion, {
    enableImplicitConversion: true,
    exposeDefaultValues: true,
  });
  const errores = validateSync(variables, { skipMissingProperties: false });
  if (errores.length > 0) {
    const detalle = errores
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('; ');
    throw new Error(`Variables de entorno inválidas: ${detalle}`);
  }
  return variables;
}
