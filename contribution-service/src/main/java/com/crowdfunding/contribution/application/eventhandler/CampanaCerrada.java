package com.crowdfunding.contribution.application.eventhandler;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import java.util.UUID;

/**
 * Evento de integración {@code campana.cerrada}, que llega de campaign-service
 * (docs/contratos-de-eventos.md).
 *
 * @param estadoFinal FINALIZADA (meta alcanzada o plazo vencido) o CANCELADA
 */
public record CampanaCerrada(UUID idEvento, UUID idCampana, EstadoCampanaAportable estadoFinal)
    implements Command<Voidy> {

  public static final String TIPO_EVENTO = "campana.cerrada";
}
