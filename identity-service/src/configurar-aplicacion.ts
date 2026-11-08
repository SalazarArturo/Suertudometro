import { INestApplication, RequestMethod } from '@nestjs/common';

/** Prefijo de todas las rutas públicas del servicio. */
export const PREFIJO_API = 'api/identidad';

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
  return app;
}
