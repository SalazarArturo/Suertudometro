import { InjectionToken } from '@angular/core';
import { environment } from '../../../environments/environment';

/** URL base del api-gateway, sin barra final. Las pruebas la reemplazan. */
export const URL_API = new InjectionToken<string>('URL_API', {
  factory: () => environment.urlApi,
});
