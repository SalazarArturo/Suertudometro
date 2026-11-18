package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import java.util.UUID;

public record RechazarCampanaComando(UUID idCampana, UUID idAdministrador, String observaciones)
    implements Command<DetalleCampanaDto> {}
