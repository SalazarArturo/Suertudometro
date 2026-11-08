import { plainToInstance } from 'class-transformer';
import {
  IsEnum,
  IsInt,
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
 * Las fases siguientes agregan las del JWT, el administrador y RabbitMQ.
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
