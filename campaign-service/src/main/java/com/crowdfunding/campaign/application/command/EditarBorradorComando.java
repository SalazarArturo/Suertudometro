package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import java.time.Instant;
import java.util.UUID;

public record EditarBorradorComando(
    UUID idCampana,
    UUID idSolicitante,
    String titulo,
    String historia,
    String categoria,
    String metaFinanciera,
    String moneda,
    Instant fechaLimite)
    implements Command<DetalleCampanaDto> {}
