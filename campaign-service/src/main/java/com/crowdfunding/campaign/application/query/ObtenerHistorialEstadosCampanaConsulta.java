package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.HistorialEstadoDto;
import java.util.List;
import java.util.UUID;

public record ObtenerHistorialEstadosCampanaConsulta(
    UUID idCampana, UUID idSolicitante, boolean esAdministrador)
    implements Command<List<HistorialEstadoDto>> {}
