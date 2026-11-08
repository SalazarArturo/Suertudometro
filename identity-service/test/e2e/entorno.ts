import { inject } from 'vitest';
import {
  ADMIN_CONTRASENA_PRUEBA,
  ADMIN_CORREO_PRUEBA,
  JWT_DURACION_PRUEBA,
  JWT_SECRETO_PRUEBA,
} from './valores-entorno.js';

// IdentidadModulo valida las variables de entorno en cuanto se importa
// (ConfigModule.forRoot), así que tienen que estar en process.env antes de que
// cada archivo de prueba lo importe. Este archivo corre antes, como setupFile.
process.env['DATABASE_URL'] = inject('urlBaseDatos');
process.env['JWT_SECRETO'] = JWT_SECRETO_PRUEBA;
process.env['JWT_DURACION'] = String(JWT_DURACION_PRUEBA);
process.env['ADMIN_CORREO'] = ADMIN_CORREO_PRUEBA;
process.env['ADMIN_CONTRASENA'] = ADMIN_CONTRASENA_PRUEBA;
