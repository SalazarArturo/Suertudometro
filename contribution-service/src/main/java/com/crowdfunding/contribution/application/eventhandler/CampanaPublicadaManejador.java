package com.crowdfunding.contribution.application.eventhandler;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import com.crowdfunding.contribution.application.port.EventosProcesadosPuerto;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.repository.CampanaAportableRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.IdOrganizador;
import java.time.Clock;
import java.time.Instant;
import java.util.Optional;

/**
 * Reacciona a {@code campana.publicada}: registra la campaña en la proyección local para que pueda
 * recibir aportes. Es idempotente, y si la campaña ya se había cerrado no la reabre.
 */
public class CampanaPublicadaManejador implements Command.Handler<CampanaPublicada, Voidy> {

  private final CampanaAportableRepositorio campanas;
  private final EventosProcesadosPuerto eventosProcesados;
  private final Clock reloj;

  public CampanaPublicadaManejador(
      CampanaAportableRepositorio campanas,
      EventosProcesadosPuerto eventosProcesados,
      Clock reloj) {
    this.campanas = campanas;
    this.eventosProcesados = eventosProcesados;
    this.reloj = reloj;
  }

  @Override
  public Voidy handle(CampanaPublicada evento) {
    if (!eventosProcesados.registrarSiEsNuevo(evento.idEvento(), CampanaPublicada.TIPO_EVENTO)) {
      return new Voidy();
    }

    IdCampana idCampana = new IdCampana(evento.idCampana());
    IdOrganizador idOrganizador = new IdOrganizador(evento.idOrganizador());
    Instant ahora = reloj.instant();

    Optional<CampanaAportable> existente = campanas.buscarPorId(idCampana);
    CampanaAportable campana;
    if (existente.isPresent()) {
      // El cierre llegó antes: se completan los datos, pero la campaña sigue cerrada.
      campana = existente.get();
      campana.registrarPublicacion(
          idOrganizador, evento.titulo(), evento.moneda(), evento.fechaLimite(), ahora);
    } else {
      campana =
          CampanaAportable.publicada(
              idCampana,
              idOrganizador,
              evento.titulo(),
              evento.moneda(),
              evento.fechaLimite(),
              ahora);
    }
    campanas.guardar(campana);
    return new Voidy();
  }
}
