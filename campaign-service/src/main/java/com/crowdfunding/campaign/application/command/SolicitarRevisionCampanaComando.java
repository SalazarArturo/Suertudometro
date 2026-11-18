package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import java.util.UUID;

public record SolicitarRevisionCampanaComando(UUID idCampana, UUID idSolicitante)
    implements Command<DetalleCampanaDto> {}
