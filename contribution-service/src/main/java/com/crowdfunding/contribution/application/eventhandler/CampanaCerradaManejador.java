package com.crowdfunding.contribution.application.eventhandler;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import com.crowdfunding.contribution.application.port.EventosProcesadosPuerto;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.repository.CampanaAportableRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

/**
 * Reacciona a {@code campana.cerrada}: pasa la campaña a FINALIZADA o a CANCELADA y, desde ese
 * momento, se rechazan los aportes. Es idempotente. Si el cierre llega antes que la publicación, la
 * campaña se guarda ya cerrada.
 */
public class CampanaCerradaManejador implements Command.Handler<CampanaCerrada, Voidy> {

  private final CampanaAportableRepositorio campanas;
  private final EventosProcesadosPuerto eventosProcesados;
  private final Clock reloj;

  public CampanaCerradaManejador(
      CampanaAportableRepositorio campanas,
      EventosProcesadosPuerto eventosProcesados,
      Clock reloj) {
    this.campanas = campanas;
    this.eventosProcesados = eventosProcesados;
    this.reloj = reloj;
  }

  @Override
  public Voidy handle(CampanaCerrada evento) {
    if (!eventosProcesados.registrarSiEsNuevo(evento.idEvento(), CampanaCerrada.TIPO_EVENTO)) {
      return new Voidy();
    }

    IdCampana idCampana = new IdCampana(evento.idCampana());
    Instant ahora = reloj.instant();

    Optional<CampanaAportable> existente = campanas.buscarPorId(idCampana);
    CampanaAportable campana;
    if (existente.isPresent()) {
      campana = existente.get();
      campana.cerrar(evento.estadoFinal(), ahora);
    } else {
      campana = CampanaAportable.cerradaAntesDePublicarse(idCampana, evento.estadoFinal(), ahora);
    }
    campanas.guardar(campana);
    return new Voidy();
  }
}
