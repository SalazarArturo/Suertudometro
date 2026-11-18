package com.crowdfunding.campaign.application.query;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.rule.SoloOrganizadorDuenoPuedeModificarCampanaRegla;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.sharedkernel.ExcepcionReglaDeNegocio;
import java.util.Objects;

public class ObtenerCampanaPorIdConsultaManejador
    implements Command.Handler<ObtenerCampanaPorIdConsulta, DetalleCampanaDto> {

  private final CampanaRepositorio campanaRepositorio;

  public ObtenerCampanaPorIdConsultaManejador(CampanaRepositorio campanaRepositorio) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
  }

  @Override
  public DetalleCampanaDto handle(ObtenerCampanaPorIdConsulta consulta) {
    Campana campana =
        campanaRepositorio
            .buscarPorId(IdCampana.de(consulta.idCampana()))
            .orElseThrow(
                () ->
                    new ExcepcionRecursoNoEncontrado(
                        "No se encontro la campana con id " + consulta.idCampana(),
                        "campana-no-encontrada"));

    EstadoCampana estado = campana.obtenerEstado();
    boolean esPrivada = estado == EstadoCampana.BORRADOR || estado == EstadoCampana.EN_REVISION;

    if (esPrivada && !consulta.esAdministrador()) { // ojito con esto ....
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

    return DetalleCampanaDto.desdeDominio(campana);
  }
}
