package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;
import java.util.UUID;

public record ObtenerCampanasPorOrganizadorConsulta(UUID idOrganizador, int pagina, int tamano)
    implements Command<PaginaResultadoDto<ResumenCampanaDto>> {}
