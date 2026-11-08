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

const DOMINIO = 'src/domain/cuenta-usuario/ejemplo.ts';
const APLICACION = 'src/application/comandos/ejemplo.ts';
const API = 'src/api/controladores/ejemplo.ts';
const INFRAESTRUCTURA = 'src/infrastructure/persistencia/ejemplo.ts';
const NUCLEO = 'src/sharedkernel/ejemplo.ts';

describe('Reglas de dependencia entre capas', () => {
  it.each([
    [DOMINIO, '@nestjs/common'],
    [DOMINIO, '@prisma/client'],
    [DOMINIO, 'class-validator'],
    [DOMINIO, 'node:crypto'],
    [DOMINIO, '../../application/puertos/reloj.js'],
    [DOMINIO, '../../infrastructure/persistencia/prisma.service.js'],
    [DOMINIO, '../../api/controladores/salud.controlador.js'],
    [APLICACION, '@prisma/client'],
    [APLICACION, 'amqplib'],
    [APLICACION, '@nestjs/jwt'],
    [APLICACION, '@nestjs/swagger'],
    [APLICACION, '../../infrastructure/seguridad/cifrador-argon2.js'],
    [APLICACION, '../../api/dtos/sesion.respuesta.js'],
    [API, '../../infrastructure/persistencia/prisma.service.js'],
    [API, '../../domain/cuenta-usuario/correo.js'],
    [API, '@prisma/client'],
    [API, 'amqplib'],
    [INFRAESTRUCTURA, '../../api/controladores/salud.controlador.js'],
    [NUCLEO, '@nestjs/common'],
    [NUCLEO, '../domain/cuenta-usuario/correo.js'],
  ])('%s no puede importar %s', async (archivo, importacion) => {
    expect(await infracciones(archivo, importacion)).not.toHaveLength(0);
  });

  it.each([
    [DOMINIO, '../../sharedkernel/raiz-de-agregado.js'],
    [DOMINIO, './correo.js'],
    [APLICACION, '@nestjs/cqrs'],
    [APLICACION, '@nestjs/common'],
    [APLICACION, '../../domain/cuenta-usuario/cuenta-usuario.js'],
    [APLICACION, '../../sharedkernel/error-de-dominio.js'],
    [API, '@nestjs/common'],
    [API, '@nestjs/swagger'],
    [
      API,
      '../../application/comandos/registrar-usuario/registrar-usuario.comando.js',
    ],
    [API, '../../sharedkernel/error-de-dominio.js'],
    [INFRAESTRUCTURA, '@prisma/client'],
    [INFRAESTRUCTURA, 'amqplib'],
    [INFRAESTRUCTURA, '../../domain/cuenta-usuario/cuenta-usuario.js'],
    [INFRAESTRUCTURA, '../../application/puertos/reloj.js'],
    [NUCLEO, './objeto-de-valor.js'],
  ])('%s sí puede importar %s', async (archivo, importacion) => {
    expect(await infracciones(archivo, importacion)).toEqual([]);
  });
});
