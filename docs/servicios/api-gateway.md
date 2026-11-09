# api-gateway

> **Responsable:** Efrain · **Creado:** 2026-11-08 · **Última actualización:** 2026-11-08 · **Estado:** Borrador (en revisión del equipo)
> Componente perimetral, sin dominio propio · Spring Cloud Gateway (WebFlux) · Spring Boot 4.1 · Java 21 · sin base de datos · atiende `/api/**` · puerto 8080, publicado en el host.

## 1. Responsabilidad

Es el **único punto de entrada** al sistema: el frontend solo habla con él, y ningún servicio se publica al host.

- **Enruta** cada prefijo `/api/<servicio>/**` a su servicio, sin reescribir la ruta.
- **Valida el JWT** que emite identity-service (firma HS256 y vencimiento) y convierte sus claims en los headers `X-Usuario-*` del contrato ([`identity-service.md`](identity-service.md) §5.1).
- **Borra los `X-Usuario-*` que mande el cliente** y no reenvía el `Authorization`: los servicios nunca ven el token.
- **Aplica CORS** para el frontend.
- **Responde sus propios errores** en RFC 9457.

**No hace:**
- emitir tokens ni guardar sesiones: lo hace identity-service;
- decidir permisos por rol: cada servicio responde `403` si `X-Usuario-Rol` no alcanza (§5.1 del contrato);
- lógica de negocio, ni combinar respuestas de varios servicios: cada pantalla llama a lo que necesita;
- por ahora, el límite de peticiones (Bucket4j + Caffeine, `docs/stack-y-convenciones.md` §2): llega en el siguiente PR (§12).

## 2. Rutas

Cada servicio monta su propio prefijo, como hace identity-service con `api/identidad`. Así el gateway no reescribe nada, y el `instance` de los errores coincide con la URL pública.

| Prefijo | Servicio | Destino en Docker Compose | Variable | Estado |
|---|---|---|---|---|
| `/api/identidad/**` | identity-service | `http://identity-service:8081` | `IDENTITY_URL` | Activa |
| `/api/campanas/**` | campaign-service | `http://campaign-service:8082` | — | Cuando exista el servicio |
| `/api/aportes/**` | contribution-service | `http://contribution-service:8083` | — | Cuando exista el servicio |
| `/api/novedades/**` | update-service | `http://update-service:8084` | — | Cuando exista el servicio |
| `/api/busqueda/**` | search-service | `http://search-service:8085` | — | Cuando exista el servicio |
| `/api/notificaciones/**` | notification-service | `http://notification-service:8086` | — | Cuando exista el servicio |

Los puertos son los del diagrama de despliegue. **Para activar una ruta**, se agregan en `application.yaml` la ruta (con su variable) y sus rutas públicas (§3), en un PR que revisa Efrain.

## 3. Quién puede llamar a cada ruta

Resuelve el pendiente "qué rutas son públicas, cuáles requieren sesión y cuáles requieren un rol" del estado del proyecto.

- **Rutas públicas** (sin token). Viven en `application.yaml`, en `suertudometro.rutas-publicas`:

  | Ruta | Para qué |
  |---|---|
  | `POST /api/identidad/usuarios` | Crear cuenta |
  | `POST /api/identidad/sesiones` | Iniciar sesión |
  | `GET /api/identidad/docs/**` y `GET /api/identidad/docs-json` | Swagger de identity-service (desarrollo) |

- **Todo lo demás requiere sesión**, es decir, un token válido. Así una ruta nueva nace protegida, igual que en identity-service.
- **El rol lo revisa cada servicio**, no el gateway. El gateway no conoce las reglas de cada dominio: por ejemplo, al organizador de una campaña se lo reconoce por su id, no por un rol.
- **Propuesta para los demás servicios.** Cada responsable la confirma en su documento y en el PR que activa su ruta:
  - lecturas públicas del catálogo (`GET /api/busqueda/**`);
  - del detalle de una campaña (`GET /api/campanas/{id}`);
  - de sus novedades y de sus aportes visibles.

  Aportar requiere sesión (decisión de Raul, en su documento).

## 4. Autenticación y headers

Por cada petición, en este orden:

1. **CORS** (§6). El *preflight* (`OPTIONS`) se responde aquí y no llega al servicio.
2. **Token**, si viene `Authorization: Bearer`. Se valida:
   - la firma HS256 con `JWT_SECRETO`, el mismo de identity-service; un token con otro algoritmo se rechaza;
   - `exp`, que es obligatorio, con 60 segundos de tolerancia para diferencias de reloj;
   - que traiga `sub`, `nombre` y un `rol` válido (`USUARIO` o `ADMINISTRADOR`).

   **Un token inválido o vencido da `401` aunque la ruta sea pública**, y el frontend lo entiende como sesión vencida.
3. **Ruta no pública sin token** → `401`.
4. **Headers hacia el servicio:** borra todos los `X-Usuario-*` y el `Authorization` que mandó el cliente. Si hay un token válido, agrega:

   | Header | Valor |
   |---|---|
   | `X-Usuario-Id` | `sub` |
   | `X-Usuario-Rol` | `rol` |
   | `X-Usuario-Nombre` | `nombre`, codificado para URL en UTF-8 (`Ana Pérez` → `Ana%20P%C3%A9rez`) |

   En una ruta pública también se agregan si el token es válido. Así un servicio puede saber quién mira; por ejemplo, si es el organizador de la campaña.

## 5. Errores (RFC 9457)

Los errores de los servicios pasan tal cual. Los del gateway usan el mismo formato y el mismo `type` (`docs/stack-y-convenciones.md` §5.6), con el `title` en español, como identity-service:

| Caso | Estado y código (`type`) |
|---|---|
| Sin token en una ruta que requiere sesión, o con un token inválido o vencido | `401`, `no-autenticado` (el mismo código que identity-service) |
| Ninguna ruta coincide | `404`, `about:blank` |
| El servicio no acepta la conexión (está caído o arrancando) | `503`, `servicio-no-disponible` |
| El servicio tarda más de 10 segundos en responder | `504`, `servicio-sin-respuesta` |
| Error inesperado del gateway | `500`, `about:blank`. El `detail` es genérico y el error completo queda en el log. |

Las respuestas de error también llevan los headers de CORS. Si no los llevaran, el navegador ocultaría el `401` y el frontend no sabría que la sesión venció.

## 6. CORS

- **Orígenes permitidos:** `CORS_ORIGENES`, separados por coma. Por defecto es `http://localhost:4200`, que sirve tanto para `ng serve` como para el contenedor del frontend, publicado en el mismo puerto.
- **Métodos:** `GET`, `POST`, `PUT`, `PATCH`, `DELETE` y `OPTIONS`.
- **Headers:** `Authorization` y `Content-Type`. Expone `Location`.
- **Sin credenciales** (`allowCredentials: false`): el token viaja en un header, no en cookies.
- El navegador guarda la respuesta del *preflight* una hora.

## 7. Configuración

| Variable | Por defecto | Para qué |
|---|---|---|
| `JWT_SECRETO` | — (obligatoria, de 32 bytes o más) | Validar la firma del token. Es la misma de identity-service. |
| `IDENTITY_URL` | `http://localhost:8081` | Destino de `/api/identidad`. En Docker Compose, `http://identity-service:8081`. |
| `CORS_ORIGENES` | `http://localhost:4200` | Orígenes del frontend |

- Escucha en el puerto 8080.
- `GET /salud` (Actuator) responde al healthcheck de Docker. No es una ruta hacia un servicio.
- Si falta `JWT_SECRETO` o es corta, el gateway no arranca y lo dice en el log.

## 8. Estructura de carpetas

```text
api-gateway/
├── pom.xml · mvnw · .mvn/               # Maven Wrapper: solo hace falta el JDK 21
├── Dockerfile · .dockerignore
└── src/
    ├── main/java/com/crowdfunding/gateway/
    │   ├── ApiGatewayApplication.java
    │   ├── configuracion/                # PropiedadesGateway: variables validadas al arrancar
    │   ├── seguridad/                    # ConfiguracionSeguridad (rutas públicas, JWT, CORS) y ValidadorTokens
    │   ├── identidad/                    # FiltroIdentidad: borra y agrega los X-Usuario-*
    │   └── errores/                      # Problemas (RFC 9457), PuntoDeEntradaNoAutenticado y ManejadorErrores
    ├── main/resources/application.yaml   # rutas, rutas públicas y CORS
    └── test/java/com/crowdfunding/gateway/
```

**Por qué no tiene las capas DDD:** el gateway no tiene dominio ni casos de uso; es un adaptador de borde. Las capas del `docs/stack-y-convenciones.md` §5.3 son para los servicios. Por eso los paquetes se ordenan por responsabilidad.

## 9. Patrones de diseño y justificación

| Patrón | Dónde | Por qué |
|---|---|---|
| API Gateway (*edge service*) | Todo el componente | Un solo punto de entrada: el frontend no conoce las direcciones de los servicios ni puede llamarlos directamente. |
| Cadena de responsabilidad | Filtros de Spring Security y de Spring Cloud Gateway | CORS, token, permisos y headers son pasos independientes que corren en orden; cada uno puede cortar la petición. |
| Traductor (anticorrupción) | `FiltroIdentidad` | Convierte el token, que es un detalle de la autenticación, en los headers del contrato. Así los servicios no dependen del JWT. |
| Configuración externa | `application.yaml` y variables de entorno | Las rutas, las rutas públicas y CORS cambian sin tocar el código. |

## 10. Pruebas

JUnit 5 y `WebTestClient` contra el gateway completo. El servicio de destino es un servidor HTTP de prueba que devuelve los headers que recibió.
- Una ruta pública pasa sin token, y los `X-Usuario-*` falsos del cliente no llegan al servicio.
- Sin token, una ruta protegida da `401 no-autenticado` en formato RFC 9457, y la petición no llega al servicio.
- Con un token válido llegan los tres headers (el nombre con tildes, codificado) y no llega el `Authorization`. Un `X-Usuario-Rol: ADMINISTRADOR` falso del cliente se reemplaza por el rol del token.
- Dan `401`: un token vencido, uno firmado con otro secreto, uno sin `rol` y uno inválido en una ruta pública.
- CORS: el *preflight* del frontend se acepta, el de otro origen se rechaza, y el `401` lleva los headers de CORS.
- Errores del gateway: ruta inexistente (`404`), servicio caído (`503`) y servicio lento (`504`).
- `GET /salud` responde, y el gateway no arranca sin `JWT_SECRETO` o con uno corto.

Formato con Spotless (`google-java-format`), igual que el resto del Java del proyecto (`docs/stack-y-convenciones.md` §3.2).

## 11. Dependencias con otros integrantes

| Qué | Con quién | Para qué |
|---|---|---|
| Que confirmen sus rutas públicas (§3) y avisen cuando su servicio esté listo para activar su ruta | Arturo, Raul y Gabo | Enrutar sus servicios con el acceso correcto |
| Que monten el prefijo de su servicio en sus rutas (`/api/campanas`…) | Arturo, Raul y Gabo | Que el gateway no reescriba rutas |
| Que revise el workflow de CI | Arturo | Que siga la definición de CI del equipo |

## 12. Pendientes

| # | Pendiente | Decide | Estado |
|---|---|---|---|
| G1 | Límite de peticiones (Bucket4j + Caffeine): cuántas por IP, y si el inicio de sesión tiene un límite propio | Efrain | Siguiente PR |
| G2 | Las rutas públicas de cada servicio (§3) | Cada responsable | Abierto |
| G3 | ¿El Swagger de cada servicio también se publica por el gateway? Hoy, solo el de identity-service. | Equipo | Abierto |

## 13. Plan de implementación

- [ ] **Fase 1 · Base** (`feat/gateway-base`): la ruta de identity-service, JWT, headers `X-Usuario-*`, CORS, errores RFC 9457, `/salud`, Dockerfile y CI.
- [ ] **Fase 2 · Límite de peticiones** (`feat/gateway-limite-peticiones`).
- [ ] **Rutas de los demás servicios**, a medida que existan.

## Historial de este documento

| Fecha | Quién | Cambio |
|---|---|---|
| 2026-11-08 | Efrain | Primera versión: rutas, rutas públicas, autenticación y headers, errores, CORS, configuración y plan. |
