package com.crowdfunding.contribution.infrastructure.messaging;

import java.util.UUID;

/**
 * El sobre (envelope) común de todos los mensajes del bus (docs/stack-y-convenciones.md §5.5).
 *
 * @param idEvento identifica el hecho; los consumidores lo usan para no aplicarlo dos veces
 * @param tipoEvento coincide con la routing key, por ejemplo {@code aporte.registrado}
 * @param version versión del contrato del evento
 * @param ocurridoEn instante del hecho en ISO 8601 UTC
 * @param datos los campos de la ficha del evento (docs/contratos-de-eventos.md)
 */
public record SobreEvento<T>(
    UUID idEvento, String tipoEvento, int version, String ocurridoEn, T datos) {}
