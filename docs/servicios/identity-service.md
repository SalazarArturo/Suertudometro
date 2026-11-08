# identity-service

> **Responsable:** Efrain · **Creado:** 2026-11-07 · **Última actualización:** 2026-11-07 · **Estado:** Borrador (en revisión del equipo)
> Bounded context **Identidad** (subdominio genérico) · NestJS 12 · Node.js 24 · TypeScript · base de datos `identity-db` · ruta en el gateway `/api/identidad` · puerto interno 8081.

## 1. Responsabilidad

Registra las **cuentas de usuario**, inicia sesión emitiendo el **JWT** y muestra el **perfil propio**. Al arrancar crea el **primer administrador**. Cada cuenta nueva se anuncia al resto del sistema con el evento `UsuarioRegistrado`.

Lo que **no** hace, y qué servicio lo hace:
- **Aprobar, rechazar o cancelar campañas:** lo hace `campaign-service`. Es todo el trabajo del administrador. Este servicio solo pone `rol: ADMINISTRADOR` en el token, y campaign-service autoriza con ese rol.
- **Decidir quién organiza una campaña:** lo hace `campaign-service`, comparando el usuario con el `idOrganizador` de la campaña. "Organizador" no es un rol de este servicio (§2).
- **Validar el JWT en cada petición:** lo hace `api-gateway`, que reenvía la identidad en headers (§5.1).
- **CORS y límite de peticiones:** los aplica `api-gateway`.
- **Enviar correos (bienvenida u otros):** lo hace `notification-service`, al recibir `UsuarioRegistrado`.
- **Moderar cuentas de usuario** (suspender, bloquear o cambiar roles): **no se implementa**. Así se mantiene el modelo del event storming, que no tiene comandos de moderación de usuarios (decisión de Efrain del 2026-11-07, era el pendiente #6).
  > [!WARNING]
  > **Riesgo frente al enunciado.** El enunciado pide "Moderación de campañas, usuarios y estados desde administración", y es la fuente de mayor prioridad. La parte de usuarios queda sin cubrir. Está anotado en `docs/historial.md` para que lo vea el equipo.

Este servicio **no consume eventos**: según el diagrama de arquitectura, identity solo publica.

## 2. Modelo de dominio

### Agregado `CuentaUsuario` (raíz)

| Atributo | Tipo | Regla |
|---|---|---|
| `id` | `IdUsuario` (UUID) | Lo genera el servicio. |
| `correo` | `Correo` | R1 y R2. |
| `nombre` | `NombreUsuario` | R3. Es el nombre que viaja en el header `X-Usuario-Nombre`; contribution-service lo usa como `nombreAportante`. |
| `hashContrasena` | `HashContrasena` | R5. La contraseña en claro nunca forma parte del agregado. |
| `rol` | `Rol`: `USUARIO` o `ADMINISTRADOR` | R6. |
| `registradoEn` | instante UTC | Lo fija el servicio con el puerto `Reloj`. |
| `ultimoInicioSesionEn` | instante UTC o nulo | Se actualiza en cada inicio de sesión. |

Métodos del agregado:
- **`CuentaUsuario.registrar(...)`:** método de fábrica para el registro público. Crea una cuenta `USUARIO` y produce el evento de dominio **`UsuarioCreado`**, que es el nombre que tiene en el event storming.
- **`CuentaUsuario.registrarAdministrador(...)`:** igual que el anterior, pero con rol `ADMINISTRADOR`. Solo lo usa la siembra del primer administrador (§4).
- **`CuentaUsuario.reconstituir(...)`:** rehidrata una cuenta desde el repositorio, sin producir eventos.
- **`registrarInicioSesion(ahora)`:** actualiza `ultimoInicioSesionEn` y produce **`SesionIniciada`** (event storming).

Los dos eventos de dominio son los del event storming (sección 1). No se agrega ninguno.

### Roles

Cada cuenta tiene **un solo rol**:

| Rol | Quién lo tiene | Qué puede hacer |
|---|---|---|
| `USUARIO` | Toda cuenta creada con el registro público | Aportar, crear campañas y gestionar las suyas, y publicar actualizaciones de sus campañas. Cada servicio comprueba en su dominio si el usuario es el organizador. |
| `ADMINISTRADOR` | Solo la cuenta sembrada al arrancar | Aprobar, rechazar y cancelar campañas, en campaign-service. En este servicio no tiene endpoints propios. |

- **"Visitante"** es quien no ha iniciado sesión: no es un rol guardado.
- **"Organizador" y "aportante"** son papeles que dependen de cada campaña, no roles de la cuenta.

### Política de contraseñas

`PoliticaContrasena` es una función pura del dominio que valida la contraseña en claro **antes** de calcular el hash (R4). Después de esa validación, la contraseña en claro solo llega al puerto `CifradorContrasenas` y no se guarda en ningún lado.

### Reglas (invariantes)

| # | Regla | Origen |
|---|---|---|
| R1 | El correo tiene un formato válido y como máximo 254 caracteres. Se guarda normalizado: sin espacios alrededor y en minúsculas. | Propuesta de Efrain |
| R2 | El correo es único. La aplicación lo comprueba antes de registrar, y un índice `UNIQUE` lo respalda: si dos registros se cruzan, la violación del índice se traduce al mismo error, `correo-ya-registrado`. | Propuesta de Efrain |
| R3 | El nombre tiene entre 2 y 100 caracteres, sin contar los espacios de los extremos. | Propuesta de Efrain (P2) |
| R4 | La contraseña tiene entre 8 y 128 caracteres. Se pide longitud y no combinaciones de símbolos, como recomienda NIST SP 800-63B. | Propuesta de Efrain (P2) |
| R5 | Solo se guarda el hash de la contraseña, con argon2id. La contraseña nunca se escribe en los logs ni se devuelve en una respuesta. | Seguridad |
| R6 | El registro público siempre crea cuentas `USUARIO`. Una cuenta `ADMINISTRADOR` solo se crea con la siembra. | Decisión de Efrain, 2026-11-07 |
| R7 | Si el correo no existe o la contraseña no coincide, el error es el mismo (`credenciales-invalidas`). Cuando el correo no existe, igual se verifica un hash de relleno para que el tiempo de respuesta no delate qué correos están registrados. | Seguridad |

## 3. Estados

`CuentaUsuario` no tiene estados: nace activa y sigue así. No hay suspensión, porque no hay moderación de usuarios (§1). Las cuentas tampoco se eliminan, porque otros servicios las referencian por id (aportes, campañas).

## 4. Comandos

| Comando | Quién lo ejecuta | Qué valida | Resultado |
|---|---|---|---|
| `RegistrarUsuarioComando` | Visitante, sin sesión | R1 a R6 | Guarda la `CuentaUsuario`, emite `UsuarioCreado` y publica `UsuarioRegistrado` (mediante outbox, §6) |
| `IniciarSesionComando` | Visitante con cuenta | R7 | Emite `SesionIniciada` y devuelve el token (§5.1). Es un comando y no una consulta porque cambia la cuenta (`ultimoInicioSesionEn`). |
| `CrearAdministradorInicialComando` | El propio servicio, al arrancar | R1 a R5 | Si no existe una cuenta con `ADMIN_CORREO`, la crea con rol `ADMINISTRADOR`, emite `UsuarioCreado` y publica `UsuarioRegistrado`. Si ya existe, no hace nada y lo deja en el log (es idempotente). |

Cada comando tiene su `...ComandoManejador` con `@nestjs/cqrs`. `CrearAdministradorInicialComando` no es un comando del event storming, porque no lo decide ningún actor: es la inicialización técnica que hace falta para que exista quien apruebe las campañas.

## 5. Consultas y endpoints REST

El servicio monta el prefijo global `api/identidad`. Así, el gateway enruta `/api/identidad/**` sin reescribir la ruta, y el campo `instance` de los errores coincide con la URL pública.

Convenciones (`docs/stack-y-convenciones.md` §5.6): JSON en `camelCase` y errores en RFC 9457 (`application/problem+json`), con `type` de la forma `https://api.suertudometro.com/errores/<codigo>`.

| Método y ruta | Quién puede usarlo | Comando o consulta | Respuesta |
|---|---|---|---|
| `POST /api/identidad/usuarios` | Cualquiera, sin sesión | `RegistrarUsuarioComando` | `201 Created` con el usuario |
| `POST /api/identidad/sesiones` | Cualquiera, sin sesión | `IniciarSesionComando` | `200` con el token |
| `GET /api/identidad/perfil` | Usuario autenticado | `ObtenerUsuarioPorIdConsulta`, con el id de `X-Usuario-Id` | `200` con el usuario |
| `GET /salud` | Healthcheck de Docker (interno: sin prefijo y no pasa por el gateway) | — | `200` |
| `GET /api/identidad/docs` | Desarrollo | Documentación OpenAPI (`@nestjs/swagger`) | Swagger UI |

Cuerpo de `POST /api/identidad/usuarios`:

```json
{
  "nombre": "Ana Pérez",
  "correo": "ana@example.org",
  "contrasena": "una frase larga y secreta"
}
```

Respuesta (`201`), igual a la de `GET /perfil`:

```json
{
  "id": "e3b68016-9750-41b3-9e34-762dd8346001",
  "nombre": "Ana Pérez",
  "correo": "ana@example.org",
  "rol": "USUARIO",
  "registradoEn": "2026-11-07T14:00:00Z"
}
```

Cuerpo de `POST /api/identidad/sesiones` y su respuesta (`200`):

```json
{ "correo": "ana@example.org", "contrasena": "una frase larga y secreta" }
```

```json
{
  "tokenAcceso": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "tipoToken": "Bearer",
  "expiraEn": "2026-11-07T15:00:00Z",
  "usuario": {
    "id": "e3b68016-9750-41b3-9e34-762dd8346001",
    "nombre": "Ana Pérez",
    "correo": "ana@example.org",
    "rol": "USUARIO"
  }
}
```

El registro no devuelve un token: el frontend inicia sesión justo después con los mismos datos.

| Error | Código y `type` |
|---|---|
| Datos mal formados: correo inválido, nombre o contraseña fuera de rango, campos de más | `400`, `validacion` (con la extensión `errores: [{ "campo", "mensaje" }]`) |
| El correo ya tiene una cuenta | `409`, `correo-ya-registrado` |
| Correo inexistente o contraseña incorrecta | `401`, `credenciales-invalidas` |
| Sin sesión en `/perfil` (normalmente lo corta antes el gateway) | `401`, `no-autenticado` |
| La cuenta del token ya no existe (por ejemplo, tras reiniciar la base) | `404`, `usuario-no-encontrado` |

### 5.1 Contrato del token y de los headers

> Esta sección es la **fuente única** del contrato de identidad entre el gateway y los servicios (decisión #5 del 2026-11-07, ver `docs/historial.md`). `api-gateway.md` la referenciará.

**El token (lo emite este servicio):**
- JWT firmado con **HS256** y el secreto `JWT_SECRETO`, de al menos 32 bytes. Lo comparten identity-service y api-gateway por `.env`.
- Claims: `sub` (id del usuario), `correo`, `nombre`, `rol` (`USUARIO` o `ADMINISTRADOR`), `iat` y `exp`.
- Dura `JWT_DURACION`: **3600 segundos** (1 hora). No hay refresh token. Cuando el token caduca, el gateway responde `401` y el frontend manda a iniciar sesión.

**Los headers (los pone el gateway):**
1. El gateway valida la firma y la expiración del token.
2. **Borra** cualquier header `X-Usuario-*` que mande el cliente.
3. Agrega estos headers y reenvía la petición:

| Header | Valor | Ejemplo |
|---|---|---|
| `X-Usuario-Id` | `sub` del token (UUID) | `e3b68016-9750-41b3-9e34-762dd8346001` |
| `X-Usuario-Rol` | `rol` del token | `USUARIO` |
| `X-Usuario-Nombre` | `nombre` del token, en UTF-8 codificado para URL (*percent-encoding*), porque un header no admite tildes ni `ñ` | `Ana%20P%C3%A9rez` |

**Los servicios** no validan el JWT: confían en esos headers, porque ningún servicio se publica al host y solo el gateway llega a ellos. Si falta `X-Usuario-Id` en una ruta que requiere sesión, responden `401`. Si la ruta requiere `ADMINISTRADOR` y `X-Usuario-Rol` no lo es, responden `403`. identity-service lee los mismos headers para `/perfil`.

**Rutas públicas de identity-service** (el gateway las deja pasar sin token): `POST /api/identidad/usuarios` y `POST /api/identidad/sesiones`. La tabla completa de rutas públicas del sistema irá en `api-gateway.md`.

## 6. Eventos

**Publica `UsuarioRegistrado`** (`usuario.registrado`, versión 1) cada vez que se crea una cuenta: con el registro público y con la siembra del administrador. `datos` lleva exactamente los campos de su ficha en [`docs/contratos-de-eventos.md`](../contratos-de-eventos.md): `idUsuario` y `correo`. Lo consume notification-service.

`SesionIniciada` **no sale del servicio**.

Para no perder eventos se usa una **tabla outbox** (`eventos_salida`):
1. **Misma transacción.** El repositorio guarda la cuenta y, en la misma transacción de Prisma, las filas de `eventos_salida`. Un traductor de infraestructura (`MapeadorEventosIntegracion`) convierte `UsuarioCreado` en el envelope de `UsuarioRegistrado`, con `idEvento`, `tipoEvento`, `version`, `ocurridoEn` y `datos`.
2. **Publicador programado.** Cada 2 segundos (`OUTBOX_INTERVALO_MS`), el `PublicadorEventosSalida` toma hasta 50 filas pendientes con `SELECT … FOR UPDATE SKIP LOCKED` y las publica en el exchange topic `suertudometro.events`:
   - routing key igual a `tipoEvento`, mensaje persistente, `contentType: application/json` y `messageId` igual a `idEvento`;
   - usa un canal con confirmaciones del broker (*publisher confirms*): marca `publicado_en` solo cuando RabbitMQ confirma;
   - si falla, suma `intentos`, guarda `ultimo_error` y lo reintenta en la siguiente vuelta.
3. **Reconexión.** Si se cae la conexión con RabbitMQ, el publicador se reconecta con espera exponencial (de 1 a 30 segundos). Mientras tanto, los eventos esperan en la tabla.

La entrega es **al menos una vez**: notification-service descarta los duplicados por `idEvento`.

Se usa `amqplib` directamente, no `@nestjs/microservices`, porque ese paquete envuelve los mensajes en un formato que Java y Python no entienden (`docs/stack-y-convenciones.md` §3.2). identity-service declara el exchange con `assertExchange`, que es idempotente. No declara colas, porque no consume eventos.

## 7. Base de datos (`identity-db`)

Migraciones con Prisma Migrate. Los modelos de Prisma se mapean a tablas y columnas en `snake_case` con `@map` y `@@map`.

| Tabla | Columnas principales | Para qué |
|---|---|---|
| `cuentas_usuario` | `id` (UUID, PK), `correo` `VARCHAR(254)` `UNIQUE`, `nombre` `VARCHAR(100)`, `hash_contrasena` `TEXT`, `rol` (enum `rol_usuario`), `ultimo_inicio_sesion_en` `TIMESTAMPTZ` (nulo hasta el primer inicio de sesión), `creado_en` y `actualizado_en` `TIMESTAMPTZ` | Las cuentas. El índice único de `correo` sirve también para buscar la cuenta al iniciar sesión. |
| `eventos_salida` | `id_evento` (UUID, PK), `tipo_evento`, `version`, `contenido` `JSONB` (el envelope completo), `ocurrido_en` `TIMESTAMPTZ`, `publicado_en` `TIMESTAMPTZ` (nulo mientras está pendiente), `intentos` `INT`, `ultimo_error` `TEXT` | El outbox. Lleva un índice parcial sobre `ocurrido_en` con `WHERE publicado_en IS NULL`, para que el publicador encuentre rápido los pendientes. Prisma no modela índices parciales, así que va en SQL propio dentro de la migración. |

No hay tabla `eventos_procesados`, porque el servicio no consume eventos.

## 8. Estructura de carpetas

Un solo proyecto NestJS con las cinco capas en `src/<capa>/` (`docs/stack-y-convenciones.md` §5.4). Lo que en Java impide el multimódulo de Maven, aquí lo impide ESLint: reglas `no-restricted-imports` por carpeta, que el CI hace cumplir.

```text
identity-service/
├── package.json · tsconfig.json · nest-cli.json · eslint.config.mjs
├── Dockerfile                      # multi-stage con node:24; aplica `prisma migrate deploy` y arranca
├── prisma/
│   ├── schema.prisma               # modelos del ORM, separados del dominio
│   └── migrations/
├── src/
│   ├── main.ts                     # prefijo global, ValidationPipe, filtro RFC 9457, Swagger
│   ├── app.module.ts               # raíz de composición: une cada puerto con su adaptador
│   ├── sharedkernel/               # RaizDeAgregado, EventoDeDominio, ObjetoDeValor, ReglaDeNegocio, ErrorDeDominio
│   ├── domain/cuenta-usuario/      # CuentaUsuario, objetos de valor, PoliticaContrasena, eventos, reglas,
│   │                               # errores e interfaz RepositorioCuentasUsuario. Sin NestJS ni Prisma.
│   ├── application/
│   │   ├── comandos/               # registrar-usuario/registrar-usuario.comando.ts y .comando-manejador.ts, etc.
│   │   ├── consultas/              # obtener-usuario-por-id/
│   │   └── puertos/                # CifradorContrasenas, EmisorTokens, LectorUsuarios, Reloj
│   ├── infrastructure/
│   │   ├── persistencia/           # PrismaService, repositorio, mapper dominio ↔ Prisma, LectorUsuarios
│   │   ├── mensajeria/             # conexión a RabbitMQ, PublicadorEventosSalida, MapeadorEventosIntegracion
│   │   ├── seguridad/              # CifradorArgon2, EmisorTokensJwt
│   │   ├── arranque/               # SembradorAdministrador (ejecuta CrearAdministradorInicialComando)
│   │   └── configuracion/          # variables de entorno validadas
│   └── api/
│       ├── controladores/          # usuarios, sesiones, perfil, salud
│       ├── dtos/                   # peticiones y respuestas, con class-validator y @ApiProperty
│       ├── seguridad/              # GuardIdentidad (lee X-Usuario-*), @Publico, @UsuarioActual
│       └── errores/                # FiltroProblemas (RFC 9457) y catálogo de errores
└── test/
    ├── integracion/                # Testcontainers: PostgreSQL y RabbitMQ
    └── e2e/                        # Supertest
```

**Reglas de importación entre capas:**
- `domain` solo importa de `domain` y `sharedkernel`. No puede importar `@nestjs/*`, `@prisma/*`, `amqplib` ni `class-validator`.
- `application` importa de `domain` y `sharedkernel`, más `@nestjs/cqrs` y la inyección de dependencias de `@nestjs/common`, que el §5.3 permite. No puede importar Prisma, `amqplib`, JWT, Swagger, `infrastructure` ni `api`.
- `api` importa de `application` y `sharedkernel`. No puede importar `infrastructure` ni Prisma.
- `infrastructure` importa de `domain`, `application` y `sharedkernel`. No puede importar `api`.

**Nombres de archivo** en kebab-case (§5.4): `registrar-usuario.comando.ts` contiene `RegistrarUsuarioComando`, y `registrar-usuario.comando-manejador.ts` contiene `RegistrarUsuarioComandoManejador`.

**ESM.** Los paquetes de NestJS 12 solo se publican como módulos ES, así que el proyecto también es ESM (`"type": "module"`): las importaciones relativas terminan en `.js` y no hay alias de rutas. Las reglas de capas de ESLint (`eslint.capas.mjs`) reconocen cada capa por el nombre de su carpeta, y una prueba (`test/arquitectura/capas.spec.ts`) comprueba que fallan cuando deben.

**Pruebas:**
- dominio y aplicación con Vitest (el runner oficial de NestJS 12; Jest no funciona bien con ESM), sin base de datos ni red, usando dobles en memoria de los puertos (las pruebas unitarias van junto al código, en `*.spec.ts`);
- persistencia y mensajería con Testcontainers (PostgreSQL 18 y RabbitMQ);
- API de punta a punta con Supertest.

**Librerías propuestas:** `@nestjs/cqrs`, `@nestjs/config`, `@nestjs/swagger`, `@nestjs/jwt`, `class-validator`, `class-transformer`, `prisma` y `@prisma/client`, `amqplib` y `argon2`. Para pruebas: `@nestjs/testing`, `supertest`, `@testcontainers/postgresql` y `@testcontainers/rabbitmq`. Las versiones exactas se fijan al crear el esqueleto.

## 9. Patrones de diseño y justificación

| Patrón | Dónde | Por qué |
|---|---|---|
| Agregado (raíz) | `CuentaUsuario` | La cuenta es la unidad de consistencia: correo, nombre, rol y contraseña se validan y se guardan juntos. |
| Objeto de valor | `Correo`, `NombreUsuario`, `HashContrasena`, `IdUsuario`, `Rol` | Cada regla vive en un solo lugar y no hay forma de saltársela: no se puede crear un correo inválido ni guardar una contraseña en claro. |
| Método de fábrica y reconstitución | `registrar`, `registrarAdministrador` y `reconstituir` | Separan la creación (que produce eventos) de la carga desde la base (que no los produce). |
| Regla de negocio (como en el repositorio del docente) | R1 a R7 | Cada regla se declara y se prueba por separado. |
| Repositorio | Interfaz en `domain`, implementación con Prisma en `infrastructure` | El dominio no depende de la base de datos. |
| CQRS (con `@nestjs/cqrs`) | Comandos y consultas separados; la consulta del perfil lee con `LectorUsuarios`, que devuelve un DTO sin cargar el agregado | Leer el perfil no necesita el hash de la contraseña ni las reglas del agregado. |
| Puertos y adaptadores (Strategy) | `CifradorContrasenas` (argon2id), `EmisorTokens` (JWT) y `Reloj` | El algoritmo de hash o el formato del token cambian sin tocar el dominio, y las pruebas usan dobles rápidos. |
| Eventos de dominio y de integración | `UsuarioCreado` dentro del servicio, `UsuarioRegistrado` en el bus | notification-service conoce las cuentas sin acoplarse a este servicio. |
| Traductor de eventos | `MapeadorEventosIntegracion` | El contrato público (`UsuarioRegistrado`) no cambia si cambia el evento interno. |
| Transactional Outbox | Tabla `eventos_salida` | Toda cuenta guardada publica su evento, aunque RabbitMQ esté caído. Si se perdiera uno, notification-service no conocería el correo de esa persona. |
| Mapper | Dominio ↔ Prisma | El dominio no lleva tipos ni decoradores de Prisma. |
| Guard y decorador | `GuardIdentidad`, `@Publico` y `@UsuarioActual` | Quién puede usar cada endpoint queda declarado en el borde, fuera de los casos de uso. |
| Filtro de excepciones | `FiltroProblemas` | Traduce los errores de dominio y de aplicación a RFC 9457 en un solo lugar. |

## 10. Dependencias con otros integrantes

| Qué | Con quién | Para qué |
|---|---|---|
| Que lean los headers `X-Usuario-Id`, `X-Usuario-Rol` y `X-Usuario-Nombre` (§5.1) y usen los roles `USUARIO` y `ADMINISTRADOR` | Arturo, Raul y Gabo | Saber quién hace cada petición: el administrador aprueba, rechaza y cancela campañas; el organizador se comprueba por id; el aportante viene en los headers |
| Que decida qué roles pueden aportar (lo pregunta su §10) | Raul | Los permisos de `POST /api/aportes` |
| Que revise el cambio en la fila "Moderación de usuarios" del enunciado §4 | Raul (responsable de `docs/enunciado/`) | Mantener alineado su documento |
| Que defina qué valida el CI en cada servicio y proteja `main` | Arturo | Que el workflow de identity-service siga esa definición |
| api-gateway, `docker-compose.yml`, RabbitMQ, `.env.example` y notification-service (consume `usuario.registrado`) | Efrain | Integrar el servicio; son piezas propias, pero de otros documentos |

Mientras no esté el gateway, las pruebas envían los headers `X-Usuario-*` a mano.

## 11. Pantallas del frontend (identidad y acceso)

Son parte de la base de Angular, que también es de Efrain. El detalle irá en `docs/frontend.md`.

- **Registro:** nombre, correo, contraseña y confirmación de la contraseña. Al terminar, inicia sesión automáticamente.
- **Iniciar sesión:** correo y contraseña.
- **Mi perfil:** nombre, correo y fecha de registro.
- **En el shell:**
  - un interceptor agrega `Authorization: Bearer <token>` a cada petición;
  - las rutas se protegen por sesión, y el panel de administración por el rol `ADMINISTRADOR`;
  - un `401` manda a iniciar sesión;
  - cerrar sesión descarta el token (no hay endpoint, porque el token no tiene estado en el servidor).

Las pantallas del panel de administración (aprobar, rechazar y cancelar campañas) son de campaign-service.

## 12. Pendientes de este servicio

| # | Pendiente | Decide | Estado |
|---|---|---|---|
| P1 | ¿`UsuarioRegistrado` necesita `nombre` para personalizar los correos? Hoy la ficha lleva solo `idUsuario` y `correo`. | Efrain, al diseñar notification-service | Abierto. Si hace falta, se propone una versión 2 de la ficha por PR. |
| P2 | Confirmar los límites del nombre y de la contraseña (R3 y R4) | Efrain | Propuesta: nombre de 2 a 100 caracteres; contraseña de 8 a 128 |

## 13. Plan de implementación

Una rama y un PR por fase (`docs/stack-y-convenciones.md` §5.8). Al terminar cada fase se actualiza "Avance por servicio" en `docs/estado-del-proyecto.md`.

- [ ] **Fase 0 · Diseño** (`docs/identity-diseno`): este documento y las decisiones en el historial.
- [ ] **Fase 1 · Esqueleto** (`feat/identity-esqueleto`):
  - proyecto NestJS 12 (ESM) con TypeScript 6 estricto, carpetas por capa y reglas de importación en ESLint;
  - Vitest, configuración validada, `sharedkernel`, `GET /salud`, Dockerfile y workflow de CI (lo revisa Arturo).
  - *Pruebas:* humo de `/salud`, ESLint falla si `domain` importa NestJS, y `docker build`.
- [ ] **Fase 2 · Dominio y aplicación en aislado** (`feat/identity-dominio`):
  - objetos de valor, `PoliticaContrasena`, `CuentaUsuario`, eventos, los tres comandos, la consulta y los puertos con sus dobles en memoria.
  - *Pruebas unitarias:* R1 a R7, los eventos emitidos (y que `reconstituir` no emita ninguno), y los manejadores: correo duplicado; correo inexistente y contraseña incorrecta dan el mismo error; siembra idempotente.
- [ ] **Fase 3 · Persistencia** (`feat/identity-persistencia`):
  - `schema.prisma`, la migración inicial (con el índice parcial), el repositorio con outbox en la misma transacción, el mapper, `LectorUsuarios` y `CifradorArgon2`.
  - *Pruebas con Testcontainers:* guardar y cargar, correo duplicado concurrente, fila de outbox con el envelope correcto y rollback conjunto.
- [ ] **Fase 4 · API REST** (`feat/identity-api`):
  - prefijo global, `ValidationPipe`, `FiltroProblemas`, Swagger y `POST /usuarios`.
  - *Pruebas e2e:* `201`, `400` y `409` en formato RFC 9457, el hash nunca aparece en la respuesta, y el documento OpenAPI se genera.
- [ ] **Fase 5 · Autenticación** (`feat/identity-autenticacion`):
  - `EmisorTokensJwt`, `POST /sesiones`, `GuardIdentidad`, `GET /perfil` y la siembra del administrador.
  - *Pruebas:* claims y duración del token, `401` por credenciales inválidas y por falta de sesión, nombre con tildes en el header y siembra idempotente.
- [ ] **Fase 6 · Mensajería** (`feat/identity-mensajeria`):
  - conexión a RabbitMQ con confirmaciones y reconexión, y `PublicadorEventosSalida`.
  - *Pruebas con Testcontainers:* llega el envelope de `usuario.registrado`; con RabbitMQ caído, el evento espera y se publica al volver; nada se publica dos veces.
- [ ] **Fase 7 · Integración** (`chore/compose-identity`):
  - `identity-db` e `identity-service` en `docker-compose.yml`, con healthchecks, y las variables en `.env.example`;
  - la ruta del gateway va en su propio PR.
  - *Verificación:* `docker compose up --build`; registro, inicio de sesión y perfil por `/api/identidad`; el admin sembrado puede iniciar sesión, y los dos eventos se ven en RabbitMQ.
- [ ] **Pantallas** (§11), con la base de Angular.

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-07 | Efrain | Primera versión, con las decisiones de roles, primer administrador, contrato del token (#5), sin moderación de usuarios (#6) y #8. |
