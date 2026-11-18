package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.application.port.out.PublicadorEventosPuerto;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.ObservacionModeracion;
import java.time.Instant;
import java.util.Objects;

public class RechazarCampanaComandoManejador
    implements Command.Handler<RechazarCampanaComando, DetalleCampanaDto> {

  private final CampanaRepositorio campanaRepositorio;
  private final PublicadorEventosPuerto publicadorEventos;

  public RechazarCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
    this.publicadorEventos = Objects.requireNonNull(publicadorEventos);
  }

  @Override
  public DetalleCampanaDto handle(RechazarCampanaComando comando) {
    Campana campana =
        campanaRepositorio
            .buscarPorId(IdCampana.de(comando.idCampana()))
            .orElseThrow(
                () ->
                    new ExcepcionRecursoNoEncontrado(
                        "No se encontro la campana con id " + comando.idCampana(),
                        "campana-no-encontrada"));

    campana.rechazar(
        comando.idAdministrador(),
        new ObservacionModeracion(comando.observaciones()),
        Instant.now());

    campanaRepositorio.guardar(campana);
    publicadorEventos.publicar(campana.extraerEventos());

    return DetalleCampanaDto.desdeDominio(campana);
  }
}
