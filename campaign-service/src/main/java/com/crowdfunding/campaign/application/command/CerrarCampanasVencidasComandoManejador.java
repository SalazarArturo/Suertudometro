package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.port.out.PublicadorEventosPuerto;
import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.repository.CampanaRepositorio;
import java.time.Instant;
import java.util.List;
import java.util.Objects;

public class CerrarCampanasVencidasComandoManejador
    implements Command.Handler<CerrarCampanasVencidasComando, Integer> {

  private final CampanaRepositorio campanaRepositorio;
  private final PublicadorEventosPuerto publicadorEventos;

  public CerrarCampanasVencidasComandoManejador(
      CampanaRepositorio campanaRepositorio, PublicadorEventosPuerto publicadorEventos) {
    this.campanaRepositorio = Objects.requireNonNull(campanaRepositorio);
    this.publicadorEventos = Objects.requireNonNull(publicadorEventos);
  }

  @Override
  public Integer handle(CerrarCampanasVencidasComando comando) {
    Instant ahora = comando.momentoActual() != null ? comando.momentoActual() : Instant.now();
    List<Campana> vencidas = campanaRepositorio.buscarPublicadasConPlazoVencido(ahora);

    for (Campana campana : vencidas) {
      campana.cerrarPorPlazoVencido(ahora);
      campanaRepositorio.guardar(campana);
      publicadorEventos.publicar(campana.extraerEventos());
    }

    return vencidas.size();
  }
}
