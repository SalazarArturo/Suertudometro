package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import java.util.UUID;

public record CancelarCampanaComando(
    UUID idCampana, UUID idActor, boolean esAdministrador, String motivoCancelacion)
    implements Command<DetalleCampanaDto> {}
