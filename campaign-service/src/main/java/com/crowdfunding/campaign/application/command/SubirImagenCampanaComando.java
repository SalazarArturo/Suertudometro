package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.ImagenCampanaDto;
import java.util.UUID;

public record SubirImagenCampanaComando(
    UUID idCampana,
    UUID idSolicitante,
    String nombreOriginal,
    String tipoMime,
    long tamanoBytes,
    byte[] contenido,
    boolean esPortada)
    implements Command<ImagenCampanaDto> {}
