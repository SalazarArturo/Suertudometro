package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import java.util.UUID;

public record EliminarImagenCampanaComando(UUID idCampana, UUID idImagen, UUID idSolicitante)
    implements Command<Voidy> {}
