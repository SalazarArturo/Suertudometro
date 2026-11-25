import { plainToInstance } from 'class-transformer';
import {
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
 * obligatoria o tiene un valor inválido, el servicio no levanta.
 */
export class VariablesEntorno {
  @IsEnum(Entorno)
  NODE_ENV: Entorno = Entorno.Desarrollo;

  /** Puerto interno del contenedor (docs/diagramas/despliegue.excalidraw). */
  @IsInt()
  @Min(1)
  @Max(65535)
  PUERTO: number = 8086;

  /** Conexión a notification-db. No tiene valor por defecto: es obligatoria. */
  @Matches(/^postgres(ql)?:\/\/\S+$/, {
    message: 'DATABASE_URL debe ser una URL de PostgreSQL (postgresql://...)',
  })
  DATABASE_URL: string;

  /**
   * Conexión a RabbitMQ (docs/rabbitmq.md §1). Es opcional: sin ella, el
   * servicio arranca y atiende la bandeja, pero no consume eventos.
   */
  @IsOptional()
  @Matches(/^amqps?:\/\/\S+$/, {
    message: 'RABBITMQ_URL debe ser una URL de RabbitMQ (amqp://...)',
  })
  RABBITMQ_URL?: string;

  /**
   * Servidor de correo. Es opcional: sin él, los avisos llegan a la bandeja y
   * sus correos quedan pendientes.
   */
  @IsOptional()
  @IsNotEmpty({ message: 'SMTP_HOST no puede estar vacío' })
  SMTP_HOST?: string;

  @IsInt({ message: 'SMTP_PUERTO debe ser un número entero' })
  @Min(1)
  @Max(65535)
  SMTP_PUERTO: number = 1025;

  /** Remitente de los correos, como `Nombre <correo@dominio>`. */
  @IsNotEmpty({ message: 'SMTP_REMITENTE no puede estar vacío' })
  SMTP_REMITENTE: string = 'Suertudómetro <avisos@suertudometro.local>';

  /** Dirección de la aplicación, para los enlaces de los correos. */
  @Matches(/^https?:\/\/[^\s/]+(\/[^\s]*)?$/, {
    message: 'URL_FRONTEND debe ser una URL (http://...)',
  })
  URL_FRONTEND: string = 'http://localhost:4200';

  /** Cada cuántos milisegundos se buscan correos pendientes. */
  @IsInt({ message: 'CORREO_INTERVALO_MS debe ser un número entero' })
  @Min(100, { message: 'CORREO_INTERVALO_MS debe ser de al menos 100 ms' })
  @Max(60_000, {
    message: 'CORREO_INTERVALO_MS no puede pasar de 60000 ms (1 minuto)',
  })
  CORREO_INTERVALO_MS: number = 2000;
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
