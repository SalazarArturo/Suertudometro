package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;
import com.crowdfunding.campaign.application.port.out.ConsultaCampanaPuerto;
import java.util.Objects;

public class ObtenerCampanasPorOrganizadorConsultaManejador
    implements Command.Handler<
        ObtenerCampanasPorOrganizadorConsulta, PaginaResultadoDto<ResumenCampanaDto>> {

  private final ConsultaCampanaPuerto consultaCampanaPuerto;

  public ObtenerCampanasPorOrganizadorConsultaManejador(
      ConsultaCampanaPuerto consultaCampanaPuerto) {
    this.consultaCampanaPuerto = Objects.requireNonNull(consultaCampanaPuerto);
  }

  @Override
  public PaginaResultadoDto<ResumenCampanaDto> handle(
      ObtenerCampanasPorOrganizadorConsulta consulta) {
    int pagina = Math.max(0, consulta.pagina());
    int tamano = consulta.tamano() <= 0 ? 10 : Math.min(consulta.tamano(), 50);
    return consultaCampanaPuerto.listarPorOrganizador(consulta.idOrganizador(), pagina, tamano);
  }
}
