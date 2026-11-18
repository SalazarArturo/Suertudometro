package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;

public record ObtenerCampanasPorEstadoConsulta(String estado, int pagina, int tamano)
    implements Command<PaginaResultadoDto<ResumenCampanaDto>> {}
