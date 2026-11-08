import {
  INestApplication,
  RequestMethod,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { crearErrorDeValidacion } from './api/errores/error-de-validacion.js';
import { FiltroProblemas } from './api/errores/filtro-problemas.js';

/** Prefijo de todas las rutas públicas del servicio. */
export const PREFIJO_API = 'api/identidad';

/** Ruta de Swagger UI. El documento OpenAPI en JSON está en `<ruta>-json`. */
export const RUTA_DOCUMENTACION = `${PREFIJO_API}/docs`;

/**
 * Configuración común de la aplicación. La usan main.ts y las pruebas e2e,
 * para que las pruebas se comporten igual que el servicio real.
 */
export function configurarAplicacion<T extends INestApplication>(app: T): T {
  // El gateway enruta /api/identidad/** sin reescribir la ruta
  // (docs/servicios/identity-service.md §5). /salud queda fuera del prefijo:
  // es el healthcheck interno de Docker.
  app.setGlobalPrefix(PREFIJO_API, {
    exclude: [{ path: 'salud', method: RequestMethod.GET }],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      // Un campo que el DTO no declara es un error, no se ignora en silencio.
      whitelist: true,
      forbidNonWhitelisted: true,
      // No copia los valores recibidos en los errores (podrían ser contraseñas).
      validationError: { target: false, value: false },
      exceptionFactory: crearErrorDeValidacion,
    }),
  );
  app.useGlobalFilters(new FiltroProblemas());

  documentar(app);
  return app;
}

function documentar(app: INestApplication): void {
  const configuracion = new DocumentBuilder()
    .setTitle('identity-service')
    .setDescription(
      'Registro, inicio de sesión y perfil de Suertudometro. Diseño: docs/servicios/identity-service.md.',
    )
    .setVersion('0.1.0')
    .build();
  SwaggerModule.setup(
    RUTA_DOCUMENTACION,
    app,
    () => SwaggerModule.createDocument(app, configuracion),
    { jsonDocumentUrl: `${RUTA_DOCUMENTACION}-json` },
  );
}
