package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.HistorialEstadoDto;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.rule.SoloOrganizadorDuenoPuedeModificarCampanaRegla;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.sharedkernel.ExcepcionReglaDeNegocio;
import java.util.List;
import java.util.Objects;

public class ObtenerHistorialEstadosCampanaConsultaManejador
    implements Command.Handler<ObtenerHistorialEstadosCampanaConsulta, List<HistorialEstadoDto>> {

  private final CampanaRepositorio campanaRepositorio;

  public ObtenerHistorialEstadosCampanaConsultaManejador(CampanaRepositorio campanaRepositorio) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
  }

  @Override
  public List<HistorialEstadoDto> handle(ObtenerHistorialEstadosCampanaConsulta consulta) {
    Campana campana =
        campanaRepositorio
            .buscarPorId(IdCampana.de(consulta.idCampana()))
            .orElseThrow(
                () ->
                    new ExcepcionRecursoNoEncontrado(
                        "No se encontro la campana con id " + consulta.idCampana(),
                        "campana-no-encontrada"));

    if (!consulta.esAdministrador()) {
      boolean esDueno =
          consulta.idSolicitante() != null
              && campana.obtenerIdOrganizador().equals(IdOrganizador.de(consulta.idSolicitante()));
      if (!esDueno) {
        throw new ExcepcionReglaDeNegocio(
            new SoloOrganizadorDuenoPuedeModificarCampanaRegla(
                campana.obtenerIdOrganizador(),
                consulta.idSolicitante() != null
                    ? IdOrganizador.de(consulta.idSolicitante())
                    : null));
      }
    }

    return campana.obtenerHistorialEstados().stream()
        .map(HistorialEstadoDto::desdeDominio)
        .toList();
  }
}
