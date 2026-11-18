package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.PaginaResultadoDto;
import com.crowdfunding.campaign.application.dto.ResumenCampanaDto;
import com.crowdfunding.campaign.application.port.out.ConsultaCampanaPuerto;
import com.crowdfunding.campaign.domain.model.EstadoCampana;
import java.util.Objects;

public class ObtenerCampanasPorEstadoConsultaManejador
    implements Command.Handler<
        ObtenerCampanasPorEstadoConsulta, PaginaResultadoDto<ResumenCampanaDto>> {

  private final ConsultaCampanaPuerto consultaCampanaPuerto;

  public ObtenerCampanasPorEstadoConsultaManejador(ConsultaCampanaPuerto consultaCampanaPuerto) {
    this.consultaCampanaPuerto = Objects.requireNonNull(consultaCampanaPuerto);
  }

  @Override
  public PaginaResultadoDto<ResumenCampanaDto> handle(ObtenerCampanasPorEstadoConsulta consulta) {
    EstadoCampana estado = parsearEstado(consulta.estado());
    int pagina = Math.max(0, consulta.pagina());
    int tamano = consulta.tamano() <= 0 ? 10 : Math.min(consulta.tamano(), 50);
    return consultaCampanaPuerto.listarPorEstado(estado, pagina, tamano);
  }

  private EstadoCampana parsearEstado(String textoEstado) {
    if (textoEstado == null || textoEstado.isBlank()) {
      return EstadoCampana.EN_REVISION;
    }
    try {
      return EstadoCampana.valueOf(textoEstado.trim().toUpperCase());
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException("Estado de campana no valido: " + textoEstado, ex);
    }
  }
}
