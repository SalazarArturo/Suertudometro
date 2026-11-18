package com.crowdfunding.campaign.application.port.out;

import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;
import com.crowdfunding.campaign.domain.model.EstadoCampana;
import java.util.UUID;

public interface ConsultaCampanaPuerto {
  // para listados rapidos y paginacion
  // el resto puede seguir leyendose desde el repository
  // como obtener una sola campana
  PaginaResultadoDto<ResumenCampanaDto> listarPorOrganizador(
      UUID idOrganizador, int pagina, int tamano);

  PaginaResultadoDto<ResumenCampanaDto> listarPorEstado(
      EstadoCampana estado, int pagina, int tamano);
}
