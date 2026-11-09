# Diseño de los servicios

> Índice y plantilla de los documentos de diseño. **Cada responsable escribe y mantiene el documento de sus servicios antes de programar**, y lo actualiza cuando cambia el diseño. Nadie escribe el documento de otro integrante.
> Carpeta creada por Raul el 2026-11-07.

## Índice

| Servicio | Documento | Responsable | Estado |
|---|---|---|---|
| `contribution-service` | [contribution-service.md](contribution-service.md) | Raul | Borrador (en revisión) |
| `campaign-service` | [campaign-service.md](campaign-service.md) | Arturo | Borrador (en revisión) |
| `identity-service` | [identity-service.md](identity-service.md) | Efrain | Borrador (en revisión) |
| `notification-service` | `notification-service.md` | Efrain | Sin documento |
| `api-gateway` | `api-gateway.md` (corto: rutas, seguridad y CORS) | Efrain | Sin documento |
| `update-service` | [update-service.md](update-service.md) | Gabo | Borrador (en revisión) |
| `search-service` | `search-service.md` | Gabo | Sin documento |

Cuando crees un documento o cambie su estado, actualiza esta tabla y la de "Avance por servicio" en `docs/estado-del-proyecto.md`.

## Plantilla

Copia este esqueleto en `docs/servicios/<servicio>.md`. [`contribution-service.md`](contribution-service.md) es un ejemplo completo.

````markdown
# <servicio>

> **Responsable:** <integrante> · **Creado:** AAAA-MM-DD · **Última actualización:** AAAA-MM-DD · **Estado:** Borrador | Vigente
> Bounded context, tecnología, base de datos, ruta en el gateway y puerto interno.

## 1. Responsabilidad
Qué hace el servicio y qué NO hace (y qué servicio lo hace en su lugar).

## 2. Modelo de dominio
Agregados, objetos de valor y reglas (invariantes), con los nombres del event storming en español ASCII.

## 3. Estados y transiciones
Solo si algún agregado tiene estados.

## 4. Comandos
| Comando | Quién lo ejecuta | Qué valida | Resultado (evento) |

## 5. Consultas y endpoints REST
| Método y ruta | Quién puede usarlo | Consulta o comando | Respuesta y errores |

## 6. Eventos
Cuáles publica (su contrato va en `docs/contratos-de-eventos.md`) y cuáles consume (y qué hace con cada uno).

## 7. Base de datos
Tablas y columnas principales, en snake_case ASCII.

## 8. Estructura de carpetas

## 9. Patrones de diseño y justificación
El enunciado exige que los patrones estén "aplicados y justificados de acuerdo con el dominio".

## 10. Dependencias con otros integrantes
Qué necesitas de otros servicios o personas, y para qué.

## 11. Pantallas del frontend
Las pantallas de tu dominio.

## 12. Pendientes de este servicio

## 13. Plan de implementación

## Historial de este documento
| Fecha | Quién | Cambio |
````
