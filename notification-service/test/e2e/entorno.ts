import { inject } from 'vitest';

// NotificacionesModulo valida las variables de entorno en cuanto se importa,
// así que tienen que estar antes de que cada archivo de prueba lo importe.
process.env['DATABASE_URL'] = inject('urlBaseDatos');
delete process.env['RABBITMQ_URL'];
delete process.env['SMTP_HOST'];
