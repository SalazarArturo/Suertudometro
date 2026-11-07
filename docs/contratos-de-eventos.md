# Contratos de negocio de los eventos de integración

**Propuesta para revisión del equipo · Versión 1 · 7 de noviembre de 2026**

El [event storming](event-storming-suertudometro-updated.excalidraw) define cuándo ocurre cada hecho y las políticas que activa. El [catálogo del proyecto](../README.md#eventos-de-integración-bus-de-rabbitmq) identifica al productor y a sus consumidores. Este documento propone qué debe incluir el productor en `datos` para que cada consumidor pueda actuar con su propia base de datos.

La lista de eventos, las rutas de RabbitMQ y el sobre del mensaje ya están documentados. De los campos de negocio, `idCampana`, `titulo`, `metaFinanciera` y `moneda` ya aparecen en el ejemplo de `CampanaPublicada`. Las fichas siguientes proponen los campos completos, su obligatoriedad y el uso que les dará cada consumidor. La aprobación de estos detalles corresponde a los equipos que producen y consumen el evento.

## Quién envía y quién recibe

| Evento | Routing key y valor de `tipoEvento` | Publica | Consumen |
|---|---|---|---|
| `UsuarioRegistrado` | `usuario.registrado` | `identity-service` | `notification-service` |
| `CampanaPublicada` | `campana.publicada` | `campaign-service` | `contribution-service`, `search-service`, `update-service`, `notification-service` |
| `CampanaRechazada` | `campana.rechazada` | `campaign-service` | `notification-service` |
| `AporteRegistrado` | `aporte.registrado` | `contribution-service` | `campaign-service`, `search-service`, `notification-service` |
| `MetaAlcanzada` | `meta.alcanzada` | `campaign-service` | `search-service`, `notification-service` |
| `CampanaActualizada` | `campana.actualizada` | `update-service` | `notification-service` |
| `CampanaCerrada` | `campana.cerrada` | `campaign-service` | `contribution-service`, `search-service`, `update-service` |

## Cómo leer las fichas

Los mensajes viajan por el exchange `suertudometro.events`. Los cinco campos del sobre son obligatorios. El primer ejemplo muestra un mensaje completo. Los otros seis muestran únicamente el objeto `datos`. [Formato del sobre y convenciones de datos (§5.5 y §5.7)](stack-y-convenciones.md).

| Campo | Significado |
|---|---|
| `idEvento` | UUID del hecho publicado. El productor conserva el mismo valor al reenviarlo. Un consumidor que ya lo aplicó evita duplicar el efecto. |
| `tipoEvento` | Cadena que coincide con la routing key de la tabla anterior. |
| `version` | Entero que identifica la versión del contrato. Los ejemplos usan `1`. |
| `ocurridoEn` | Instante en que ocurrió el hecho, en ISO 8601 UTC. |
| `datos` | Objeto JSON con los campos de la ficha correspondiente. |

En la propuesta, **los campos de cada ejemplo son obligatorios salvo indicación expresa**. Los identificadores que comienzan por `id` son cadenas UUID. Los importes son cadenas decimales con dos posiciones y `moneda` es el código ISO 4217. Una fecha con hora se expresa en UTC. Los demás valores de texto son cadenas JSON.

## CampanaPublicada

Cuando la administración aprueba una campaña, esta pasa a `PUBLICADA`. El mensaje identifica al organizador y lleva la información pública necesaria para construir la ficha de búsqueda.

```json
{
  "idEvento": "c2b5d4e1-789a-4c12-9b2e-f1a234567890",
  "tipoEvento": "campana.publicada",
  "version": 1,
  "ocurridoEn": "2026-11-07T14:00:00Z",
  "datos": {
    "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    "idOrganizador": "e3b68016-9750-41b3-9e34-762dd8346001",
    "titulo": "Libros para la biblioteca",
    "historia": "Queremos ampliar la colección de la biblioteca del barrio.",
    "categoria": "Educación",
    "rutaPortada": "/imagenes/biblioteca.jpg",
    "metaFinanciera": "5000.00",
    "moneda": "BOB",
    "fechaLimite": "2026-12-01T00:00:00Z"
  }
}
```

- **Novedades** guarda `idCampana` e `idOrganizador` y habilita la publicación. Al recibir `PublicarActualizacion`, comprueba que la campaña siga habilitada y que el usuario autenticado sea su organizador.
- **Búsqueda** incorpora la campaña al catálogo, indexa `titulo` e `historia`, permite filtrar por `categoria` y muestra portada, meta, moneda y plazo. El total inicial es cero, ya que los aportes se habilitan al publicarse la campaña. `rutaPortada` representa una ruta pública accesible desde el portal, independiente del volumen de Docker.
- **Contribuciones** habilita aportes para `idCampana` en la moneda indicada.
- **Notificaciones** asocia `idCampana` con `idOrganizador` y `titulo` para dirigir los avisos posteriores al contacto del organizador.

## CampanaCerrada

Campañas publica el cierre definitivo por meta alcanzada, plazo vencido o cancelación. Según el event storming, los tres casos dejan la campaña en `FINALIZADA`. Se propone que `motivoCierre` admita `META_ALCANZADA`, `PLAZO_VENCIDO` o `CANCELACION`. Son causas del cierre.

```json
{
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "motivoCierre": "META_ALCANZADA"
}
```

**Novedades** bloquea nuevas publicaciones y conserva el historial. **Búsqueda** retira la campaña del catálogo público. **Contribuciones** bloquea nuevos aportes. A los tres les basta `idCampana` para aplicar el cierre. El instante de cierre viene en `ocurridoEn`.

## CampanaActualizada

El organizador ejecutó `PublicarActualizacion` y Novedades guardó una novedad en una campaña publicada. `idActualizacion` identifica esa publicación y `contenido` es el texto escrito por el organizador. `ocurridoEn` indica cuándo se publicó.

```json
{
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "idActualizacion": "a3453c0a-0654-49fe-a974-eaa60e992881",
  "idOrganizador": "e3b68016-9750-41b3-9e34-762dd8346001",
  "contenido": "Ya recibimos la primera caja de libros."
}
```

**Notificaciones** localiza a los aportantes de esa campaña en su propia base y encola la novedad en sus bandejas. Usa `idActualizacion` como referencia a la publicación. Novedades puede emitir el mensaje sin conocer la lista de destinatarios.

## AporteRegistrado

Contribuciones registró un aporte simulado. `monto` indica cuánto se aportó **en esa operación**. Tanto Campañas como Búsqueda suman ese importe una sola vez.

```json
{
  "idAporte": "5fb46893-a255-4614-83eb-9d64ec0a4432",
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "monto": "150.00",
  "moneda": "BOB",
  "idAportante": "dcfce0af-9a86-4d5c-b79a-4c4e206754f0"
}
```

`idAportante` es **opcional**. Se propone incluirlo cuando exista una cuenta que pueda recibir novedades y omitirlo para visitantes sin cuenta. La atribución pública del aporte y la asociación privada a una bandeja son decisiones distintas. El tratamiento de las cuentas que eligen anonimato queda para acuerdo del equipo.

- **Campañas** suma el importe en la moneda de la campaña y evalúa si el total alcanzó o superó la meta.
- **Búsqueda** actualiza el importe recaudado y calcula el avance con la meta que recibió al publicarse la campaña. Con una meta de `"5000.00"`, un primer aporte de `"150.00"` lleva el avance al 3 %.
- **Notificaciones** avisa por correo al organizador y, cuando recibe `idAportante`, vincula esa cuenta a la campaña para las futuras novedades.

## MetaAlcanzada

Campañas comprobó que el total recaudado alcanzó o superó la meta. `montoRecaudado` es el total en ese instante. El aporte que hizo cruzar la meta ya está incluido.

```json
{
  "idCampana": "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
  "metaFinanciera": "5000.00",
  "montoRecaudado": "5050.00",
  "moneda": "BOB"
}
```

**Búsqueda** marca la meta como alcanzada y sigue calculando el importe acumulado con los aportes individuales, para evitar contar dos veces el último aporte. El evento que retira la ficha pública es `CampanaCerrada`. **Notificaciones** puede usar ambos importes en el aviso de meta alcanzada. Se propone dirigirlo al organizador.

## UsuarioRegistrado

Identidad creó la cuenta. `idUsuario` permite a Notificaciones reconocer a esa persona cuando otros eventos la referencian como organizador o aportante.

```json
{
  "idUsuario": "e3b68016-9750-41b3-9e34-762dd8346001",
  "correo": "organizadora@example.org"
}
```

**Notificaciones** registra la relación entre la cuenta y su correo para los avisos que correspondan.

## CampanaRechazada

La administración rechazó la solicitud de publicación. La campaña vuelve a `BORRADOR` con las observaciones necesarias para que el organizador pueda editarla o eliminarla.

```json
{
  "idCampana": "0e903b45-0518-471b-af10-f5706b5409b3",
  "idOrganizador": "e3b68016-9750-41b3-9e34-762dd8346001",
  "observaciones": "Aclara cómo se utilizarán los fondos solicitados."
}
```

**Notificaciones** entrega las observaciones al organizador identificado en el mensaje. El rechazo puede ocurrir antes de la primera publicación, por lo que el propio evento identifica al destinatario.

## Reentregas y orden de llegada

Si RabbitMQ reentrega un `AporteRegistrado`, el total y el número de avisos deben quedar iguales. Cada consumidor identifica los hechos ya aplicados mediante `idEvento`. Un consumidor que reciba un aporte antes de conocer la campaña necesita conservarlo para procesarlo cuando llegue la publicación. Un cierre recibido primero debe seguir teniendo efecto al llegar una publicación o una meta atrasada, de modo que la campaña permanezca fuera del catálogo y siga bloqueada para nuevos aportes y novedades.

## Decisiones para aprobar la versión 1

| Participantes | Acuerdo pendiente |
|---|---|
| Campañas, Búsqueda, Novedades y Contribuciones | Confirmar los datos de la publicación, en particular la identidad del organizador, la representación de la categoría y la portada, y si toda campaña tiene fecha límite. Acordar los tres valores de `motivoCierre`. |
| Contribuciones y Notificaciones | Decidir cuándo una cuenta que aporta anónimamente puede quedar vinculada en privado para recibir novedades. Los visitantes sin cuenta carecen de bandeja. |
| Novedades y Notificaciones | Confirmar si el aviso muestra el contenido completo de la novedad o requiere un extracto. La ficha propone contenido completo. |
| Campañas y Notificaciones | Confirmar los destinatarios del aviso de meta alcanzada. |
