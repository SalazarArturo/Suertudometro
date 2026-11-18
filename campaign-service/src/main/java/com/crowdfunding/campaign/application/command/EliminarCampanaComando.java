package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import java.util.UUID;

public record EliminarCampanaComando(UUID idCampana, UUID idSolicitante)
    implements Command<Voidy> {}
