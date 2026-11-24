import path from 'node:path';
import { ESLint } from 'eslint';
import tseslint from 'typescript-eslint';
import { reglasDeCapas } from '../../eslint.capas.mjs';

// Comprueba que las reglas de dependencia entre capas (docs/stack-y-convenciones.md §5.3)
// de verdad fallan cuando una capa importa lo que no debe.

const raiz = path.resolve(import.meta.dirname, '../..');

const eslint = new ESLint({
  cwd: raiz,
  overrideConfigFile: true,
  overrideConfig: [
    { files: ['**/*.ts'], languageOptions: { parser: tseslint.parser } },
    ...reglasDeCapas,
  ],
});

async function infracciones(
  archivo: string,
  importacion: string,
): Promise<string[]> {
  const [resultado] = await eslint.lintText(`import '${importacion}';\n`, {
    filePath: path.join(raiz, archivo),
  });
  return resultado.messages
    .filter((mensaje) => mensaje.ruleId === 'no-restricted-imports')
    .map((mensaje) => mensaje.message);
}

const DOMINIO = 'src/domain/aviso/ejemplo.ts';
const APLICACION = 'src/application/comandos/ejemplo.ts';
const API = 'src/api/controladores/ejemplo.ts';
const INFRAESTRUCTURA = 'src/infrastructure/persistencia/ejemplo.ts';
const NUCLEO = 'src/sharedkernel/ejemplo.ts';

describe('Reglas de dependencia entre capas', () => {
  it.each([
    [DOMINIO, '@nestjs/common'],
    [DOMINIO, '@prisma/client'],
    [DOMINIO, 'nodemailer'],
    [DOMINIO, 'node:crypto'],
    [DOMINIO, '../../application/puertos/reloj.js'],
    [DOMINIO, '../../infrastructure/errores.js'],
    [APLICACION, '@prisma/client'],
    [APLICACION, 'amqplib'],
    [APLICACION, 'nodemailer'],
    [APLICACION, '@nestjs/swagger'],
    [APLICACION, '../../infrastructure/correo/enviador-smtp.js'],
    [APLICACION, '../../api/dtos/aviso.respuesta.js'],
    [API, '../../infrastructure/persistencia/prisma.servicio.js'],
    [API, '../../domain/aviso/aviso.js'],
    [API, '@prisma/client'],
    [API, 'amqplib'],
    [API, 'nodemailer'],
    [INFRAESTRUCTURA, '../../api/controladores/salud.controlador.js'],
    [NUCLEO, '@nestjs/common'],
    [NUCLEO, '../domain/aviso/aviso.js'],
  ])('%s no puede importar %s', async (archivo, importacion) => {
    expect(await infracciones(archivo, importacion)).not.toHaveLength(0);
  });

  it.each([
    [DOMINIO, '../../sharedkernel/dinero.js'],
    [DOMINIO, './envio-correo.js'],
    [APLICACION, '@nestjs/cqrs'],
    [APLICACION, '@nestjs/common'],
    [APLICACION, '../../domain/aviso/aviso.js'],
    [API, '@nestjs/common'],
    [API, '@nestjs/swagger'],
    [API, '../../application/vistas/aviso-vista.js'],
    [INFRAESTRUCTURA, 'amqplib'],
    [INFRAESTRUCTURA, 'nodemailer'],
    [INFRAESTRUCTURA, '../../domain/aviso/aviso.js'],
    [NUCLEO, './objeto-de-valor.js'],
    ['src/domain/aviso/ejemplo.spec.ts', 'node:util'],
  ])('%s sí puede importar %s', async (archivo, importacion) => {
    expect(await infracciones(archivo, importacion)).toEqual([]);
  });
});
