package com.crowdfunding.contribution.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.contribution.application.exception.RecursoNoEncontradoExcepcion;
import com.crowdfunding.contribution.application.port.PublicadorEventosPuerto;
import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.repository.AporteRepositorio;
import com.crowdfunding.contribution.domain.repository.CampanaAportableRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.Dinero;
import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.UUID;

/**
 * Caso de uso "Realizar aporte". Arma los objetos de valor, busca la campaña en la proyección
 * local, deja que el agregado verifique las reglas, guarda el aporte y publica su evento. Todo
 * ocurre en una sola transacción.
 */
public class RealizarAporteComandoManejador
    implements Command.Handler<RealizarAporteComando, UUID> {

  private final AporteRepositorio aportes;
  private final CampanaAportableRepositorio campanas;
  private final PublicadorEventosPuerto publicadorEventos;
  private final Clock reloj;

  public RealizarAporteComandoManejador(
      AporteRepositorio aportes,
      CampanaAportableRepositorio campanas,
      PublicadorEventosPuerto publicadorEventos,
      Clock reloj) {
    this.aportes = aportes;
    this.campanas = campanas;
    this.publicadorEventos = publicadorEventos;
    this.reloj = reloj;
  }

  @Override
  public UUID handle(RealizarAporteComando comando) {
    Dinero monto = Dinero.de(comando.monto(), comando.moneda());
    MensajeApoyo mensajeApoyo = MensajeApoyo.desdeTexto(comando.mensajeApoyo()).orElse(null);
    NombreAportante nombreAportante = new NombreAportante(comando.nombreAportante());

    CampanaAportable campana =
        campanas
            .buscarPorId(new IdCampana(comando.idCampana()))
            .orElseThrow(RecursoNoEncontradoExcepcion::campana);

    // Milisegundos: la misma precisión con la que el instante viaja en el evento y en el API.
    Instant ahora = reloj.instant().truncatedTo(ChronoUnit.MILLIS);
    Aporte aporte =
        Aporte.registrar(
            campana,
            new IdAportante(comando.idAportante()),
            nombreAportante,
            monto,
            mensajeApoyo,
            comando.esAnonimo(),
            ahora);

    aportes.guardar(aporte);
    aporte.eventosDeDominio().forEach(publicadorEventos::publicar);
    aporte.limpiarEventosDeDominio();
    return aporte.id().valor();
  }
}
