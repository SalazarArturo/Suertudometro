package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import java.util.UUID;

public record ObtenerCampanaPorIdConsulta(
    UUID idCampana, UUID idSolicitante, boolean esAdministrador)
    implements Command<DetalleCampanaDto> {}
