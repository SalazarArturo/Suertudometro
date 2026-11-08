import { inject } from 'vitest';

// IdentidadModulo valida las variables de entorno en cuanto se importa
// (ConfigModule.forRoot), así que la URL de la base de pruebas tiene que estar
// en process.env antes de que cada archivo de prueba lo importe. Este archivo
// corre antes, como setupFile.
process.env['DATABASE_URL'] = inject('urlBaseDatos');
