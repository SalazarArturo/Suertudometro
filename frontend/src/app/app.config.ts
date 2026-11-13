import { registerLocaleData } from '@angular/common';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import localeEsBo from '@angular/common/locales/es-BO';
import {
  ApplicationConfig,
  inject,
  LOCALE_ID,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { MatIconRegistry } from '@angular/material/icon';
import { provideRouter, TitleStrategy, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { interceptorSesionVencida } from './core/sesion/interceptor-sesion-vencida';
import { interceptorToken } from './core/sesion/interceptor-token';
import { EstrategiaTitulo } from './core/titulo/estrategia-titulo';

// Fechas y montos en español de Bolivia (docs/frontend.md §6).
registerLocaleData(localeEsBo);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // withComponentInputBinding: los query params (?volverA=) llegan como inputs.
    provideRouter(routes, withComponentInputBinding()),
    // El orden importa: interceptorSesionVencida necesita ver el token ya puesto.
    provideHttpClient(withInterceptors([interceptorToken, interceptorSesionVencida])),
    { provide: LOCALE_ID, useValue: 'es-BO' },
    { provide: TitleStrategy, useClass: EstrategiaTitulo },
    // Los íconos son Material Symbols (la fuente se carga en index.html).
    provideAppInitializer(() => {
      inject(MatIconRegistry).setDefaultFontSetClass('material-symbols-outlined');
    }),
  ],
};
