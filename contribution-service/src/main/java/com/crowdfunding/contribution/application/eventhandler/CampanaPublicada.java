package com.crowdfunding.contribution.application.eventhandler;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import java.time.Instant;
import java.util.UUID;

/**
 * Evento de integración {@code campana.publicada}, que llega de campaign-service. Aquí están solo
 * los campos de la ficha que usa este servicio (docs/contratos-de-eventos.md).
 *
 * <p>Viaja por el mismo pipeline que los comandos, para que su manejador corra en una transacción.
 */
public record CampanaPublicada(
    UUID idEvento,
    UUID idCampana,
    UUID idOrganizador,
    String titulo,
    String moneda,
    Instant fechaLimite)
    implements Command<Voidy> {

  public static final String TIPO_EVENTO = "campana.publicada";
}
