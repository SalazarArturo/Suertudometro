package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.application.port.out.PublicadorEventosPuerto;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import java.time.Instant;
import java.util.Objects;

public class RegistrarAporteEnCampanaComandoManejador
    implements Command.Handler<RegistrarAporteEnCampanaComando, Voidy> {

  private final CampanaRepositorio campanaRepositorio;
  private final PublicadorEventosPuerto publicadorEventos;

  public RegistrarAporteEnCampanaComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
    this.publicadorEventos = Objects.requireNonNull(publicadorEventos);
  }

  @Override
  public Voidy handle(RegistrarAporteEnCampanaComando comando) {
    Campana campana =
        campanaRepositorio
            .buscarPorId(IdCampana.de(comando.idCampana()))
            .orElseThrow(
                () ->
                    new ExcepcionRecursoNoEncontrado(
                        "No se encontro la campana con id " + comando.idCampana(),
                        "campana-no-encontrada"));

    Instant momento = comando.fechaAporte() != null ? comando.fechaAporte() : Instant.now();
    campana.registrarAporte(Dinero.de(comando.monto(), comando.moneda()), momento);

    campanaRepositorio.guardar(campana);
    publicadorEventos.publicar(campana.extraerEventos());

    return new Voidy();
  }
}
