# Enunciado del Proyecto 07 · Plataforma de crowdfunding

> [!IMPORTANT]
> Transcripción del enunciado del docente (Ingeniería Web 3 · Proyecto 07, Universidad NUR). El original está en [`enunciado-proyecto-07.pdf`](enunciado-proyecto-07.pdf).
> Es la **fuente de mayor prioridad** del repositorio: define *qué* hay que entregar. Si un documento, un diagrama o el event storming lo contradicen, se corrige ese documento.
> Las secciones 1 a 3 copian el enunciado tal cual. La sección 4 (al final) es nuestra: indica cómo traduce el equipo cada requisito.

## Objetivo del proyecto

Desarrollar una plataforma inspirada en servicios como GoFundMe, donde una persona u organización pueda crear una campaña de recaudación, contar su historia, establecer una meta y recibir aportes de otros usuarios. Para fines académicos, los aportes podrán registrarse de forma simulada y no será obligatorio integrar pagos reales.

## 1. Descripción general

Necesitamos una plataforma que permita publicar campañas para distintas causas, por ejemplo educación, apoyo comunitario, emergencias, proyectos personales u otras iniciativas. Cada campaña deberá mostrar una portada, título, historia, meta económica, monto recaudado, categoría, organizador y su progreso.

Las personas podrán explorar campañas, consultar el detalle, registrar un aporte, dejar un mensaje de apoyo y compartir la campaña. Los organizadores deberán poder publicar actualizaciones para informar a la comunidad sobre avances o cambios importantes.

## 2. Funcionalidades esperadas

| Visitantes y aportantes | Organizadores y administración |
|---|---|
| Explorar campañas por categoría, estado o popularidad. | Crear, editar y publicar campañas. |
| Consultar historia, galería, meta y avance de recaudación. | Cargar portada, imágenes, historia, meta y categoría. |
| Registrar un aporte de forma simulada. | Publicar actualizaciones o novedades de la campaña. |
| Elegir si el aporte se muestra con nombre o como anónimo. | Consultar aportes recibidos y progreso de la meta. |
| Dejar un mensaje de apoyo asociado al aporte. | Moderación de campañas, usuarios y estados desde administración. |

### Flujo principal

Una campaña debe avanzar por distintos estados y conservar su historial. Mientras esté publicada podrá recibir múltiples aportes y actualizaciones. Al alcanzar la meta, vencer el período definido o ser cerrada por el organizador, deberá pasar a un estado final.

| Paso | Etapa | Detalle |
|---|---|---|
| 1 | Crear campaña | Historia, meta, portada y categoría |
| 2 | Revisar y publicar | Validación de información y estado |
| 3 | Recibir aportes | Aportes simulados y mensajes de apoyo |
| 4 | Actualizar campaña | Noticias, avances y transparencia |
| 5 | Cerrar recaudación | Meta alcanzada, vencida o cancelada |

**Estados sugeridos para una campaña:** BORRADOR → EN REVISIÓN → PUBLICADA → FINALIZADA · CANCELADA.

Los aportes pueden registrarse de forma simulada; no es obligatorio integrar una pasarela de pago real.

### Consideraciones del alcance

**No es obligatorio integrar Stripe, PayPal, bancos ni otras pasarelas de pago.** Los aportes pueden manejarse como transacciones simuladas dentro del sistema. Como mejoras opcionales se pueden incorporar campañas destacadas, favoritos, comentarios, etiquetas, reportes o un proceso de verificación de organizadores.

## 3. Arquitectura y criterios de implementación

La solución deberá implementarse mediante microservicios. La propuesta siguiente es referencial y puede ajustarse, siempre que cada servicio tenga una responsabilidad clara, un modelo de dominio coherente y una separación adecuada de datos.

**Arquitectura de referencia** (los servicios pueden ajustarse, siempre que mantengan responsabilidades y límites de dominio claros):

- Tres frentes: **Portal público** (explorar y aportar), **Panel organizador** (campañas y actualizaciones) y **Panel admin** (moderación y usuarios).
- Todos entran por un **API Gateway**.
- Detrás, seis servicios: Identity (usuarios, roles y acceso), Campaign (campañas, metas y estados), Contribution (aportes y mensajes), Search (exploración y filtros), Update (novedades de campaña) y Notification (avisos y cambios relevantes).
- Entre servicios: eventos y mensajería. DDD + CQRS + arquitectura limpia + patrones de diseño + base de datos por servicio.

| Microservicio sugerido | Responsabilidad principal |
|---|---|
| Identity Service | Registro, autenticación, usuarios y roles. |
| Campaign Service | Campañas, metas, categorías, estados e imágenes. |
| Contribution Service | Aportes simulados, anonimato y mensajes de apoyo. |
| Search Service | Exploración, filtros y consultas optimizadas de campañas. |
| Update Service | Actualizaciones y novedades publicadas por el organizador. |
| Notification Service | Avisos ante aportes, cambios de estado y meta alcanzada. |

### Requisitos arquitectónicos mínimos

- **API Gateway:** como punto de entrada a los servicios.
- **DDD y arquitectura limpia:** para organizar dominio, aplicación e infraestructura.
- **Base de datos por servicio:** evitando compartir tablas entre microservicios.
- **CQRS:** separando comandos y consultas donde resulte pertinente.
- **Eventos:** por ejemplo CampaignPublished, ContributionRegistered, GoalReached, CampaignUpdated y CampaignClosed.
- **Patrones de diseño:** aplicados y justificados de acuerdo con el dominio.

---

## 4. Cómo lo traduce el equipo

Esta sección **no** es parte del enunciado. Relaciona cada requisito con la decisión del equipo y con el documento donde está el detalle.

| Requisito del enunciado | Cómo lo resolvemos | Detalle en |
|---|---|---|
| Estados sugeridos | Enum `EstadoCampana`: `BORRADOR`, `EN_REVISION`, `PUBLICADA`, `FINALIZADA`, `CANCELADA`. `FINALIZADA` (meta alcanzada o plazo vencido) y `CANCELADA` (cierre por el organizador o la administración) son **terminales y distintos**. | `README.md` → Lenguaje ubicuo; `docs/adr/0003-estados-terminales-de-campana.md` |
| "Conservar su historial" | campaign-service guarda el historial de estados de cada campaña. | `docs/servicios/campaign-service.md` (pendiente, Arturo) |
| Eventos de ejemplo (en inglés) | Se usan en español ASCII: CampaignPublished → `CampanaPublicada`, ContributionRegistered → `AporteRegistrado`, GoalReached → `MetaAlcanzada`, CampaignUpdated → `CampanaActualizada` y CampaignClosed → `CampanaCerrada`. El equipo agrega `UsuarioRegistrado` y `CampanaRechazada`. | `README.md` → Eventos de integración |
| Microservicios sugeridos | Se mantienen los seis, con nombres de infraestructura en inglés *kebab-case*: `identity-service`, `campaign-service`, `contribution-service`, `search-service`, `update-service` y `notification-service`, más `api-gateway`. | `README.md` → Arquitectura |
| API Gateway | Spring Cloud Gateway: único punto de entrada (`/api/**`). | `docs/stack-y-convenciones.md` |
| DDD y arquitectura limpia | Capas `Api`, `Application`, `Domain`, `Infrastructure` y `SharedKernel` en cada servicio. | `docs/stack-y-convenciones.md` §5.3 |
| Base de datos por servicio | Una PostgreSQL por servicio; nadie lee la base de otro. | `docs/stack-y-convenciones.md` §2 |
| CQRS | Comandos y consultas separados; search-service es el lado de lectura del catálogo. | `README.md` |
| Aportes simulados | No hay pasarela de pago: el aporte es una transacción interna de contribution-service. | `docs/servicios/contribution-service.md` |
| Tres frentes (portal, organizador, admin) | Una sola aplicación Angular con tres zonas. | `docs/diagramas/arquitectura.excalidraw` |
| Compartir la campaña | Requerido. Falta decidir si es solo del frontend o si también se registra en el backend. | `docs/estado-del-proyecto.md` → Pendientes |
| Moderación de usuarios | No se implementa (decisión de Efrain, 2026-11-07): el administrador solo aprueba, rechaza y cancela campañas, como en el event storming. **Riesgo:** el enunciado la pide. | `docs/historial.md` → Decisiones tomadas |
| Mejoras opcionales (destacadas, favoritos, comentarios, etiquetas, reportes, verificación) | Fuera del alcance mientras el equipo no decida lo contrario. | `docs/estado-del-proyecto.md` |
| Despliegue (no lo pide el enunciado; decisión del equipo) | Todo el sistema se levanta con `docker compose up --build`. | `docs/diagramas/despliegue.excalidraw` |
