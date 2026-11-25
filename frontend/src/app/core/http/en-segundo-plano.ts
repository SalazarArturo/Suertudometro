import { HttpContextToken } from '@angular/common/http';

/**
 * Marca una petición que nadie pidió, como el sondeo de la campanita. Si responde
 * que la sesión venció, la sesión se cierra, pero no se cambia de pantalla: quien
 * está en ella podría estar escribiendo.
 */
export const EN_SEGUNDO_PLANO = new HttpContextToken<boolean>(() => false);
