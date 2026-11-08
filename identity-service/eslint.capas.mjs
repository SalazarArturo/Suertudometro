// Reglas de dependencia entre capas (docs/stack-y-convenciones.md §5.3).
// En los servicios Spring las impone el multimódulo de Maven; aquí las impone ESLint.
// Las usan eslint.config.mjs y la prueba test/arquitectura/capas.spec.ts.

/** Expresión que reconoce una importación que entra en alguna de las capas indicadas. */
const capa = (nombres) => `(^|/)(${nombres})(/|$)`;

/** Cualquier importación que no sea relativa: paquetes de npm y módulos de Node. */
const PAQUETE = '^[^.]';

const restringir = (carpeta, patterns) => ({
  files: [`src/${carpeta}/**/*.ts`],
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});

/** @type {import('eslint').Linter.Config[]} */
export const reglasDeCapas = [
  restringir('sharedkernel', [
    {
      regex: PAQUETE,
      message: 'sharedkernel es código puro: no importa paquetes ni módulos de Node.',
    },
    {
      regex: capa('domain|application|infrastructure|api'),
      message: 'sharedkernel no depende de ninguna capa del servicio.',
    },
  ]),
  restringir('domain', [
    {
      regex: PAQUETE,
      message:
        'domain es código puro: no importa NestJS, Prisma, amqplib ni ningún otro paquete.',
    },
    {
      regex: capa('application|infrastructure|api'),
      message: 'domain solo importa de domain y sharedkernel.',
    },
  ]),
  restringir('application', [
    {
      regex: '^(?!\\.|@nestjs/cqrs$|@nestjs/common$)',
      message:
        'application solo usa @nestjs/cqrs y la inyección de @nestjs/common: nada de Prisma, amqplib, JWT ni Swagger.',
    },
    {
      regex: capa('infrastructure|api'),
      message: 'application solo importa de domain y sharedkernel.',
    },
  ]),
  restringir('api', [
    {
      regex: '^(@prisma/|prisma$|amqplib$|argon2$)',
      message:
        'api no usa directamente la persistencia, la mensajería ni el cifrado: pasa por application.',
    },
    {
      regex: capa('domain|infrastructure'),
      message: 'api solo importa de application y sharedkernel.',
    },
  ]),
  restringir('infrastructure', [
    {
      regex: capa('api'),
      message: 'infrastructure no importa de api.',
    },
  ]),
];
