package com.crowdfunding.contribution.application;

import static com.crowdfunding.contribution.soporte.Ejemplos.AHORA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_APORTANTE;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_CAMPANA;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaCerrada;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaPublicada;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crowdfunding.contribution.application.command.RealizarAporteComando;
import com.crowdfunding.contribution.application.command.RealizarAporteComandoManejador;
import com.crowdfunding.contribution.application.exception.RecursoNoEncontradoExcepcion;
import com.crowdfunding.contribution.domain.event.AporteRealizado;
import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import com.crowdfunding.contribution.sharedkernel.ExcepcionReglaDeNegocio;
import com.crowdfunding.contribution.soporte.AlmacenEnMemoria;
import java.time.Clock;
import java.time.ZoneOffset;
import java.util.UUID;
import org.junit.jupiter.api.Test;

class RealizarAporteComandoManejadorTest {

  private final AlmacenEnMemoria almacen = new AlmacenEnMemoria();
  private final RealizarAporteComandoManejador manejador =
      new RealizarAporteComandoManejador(
          almacen, almacen, almacen, Clock.fixed(AHORA, ZoneOffset.UTC));

  @Test
  void guardaElAporteYPublicaSuEvento() {
    almacen.guardar(campanaPublicada());

    UUID idAporte = manejador.handle(comando("150.00", "¡Mucho éxito!", false));

    Aporte aporte = almacen.buscarPorId(new IdAporte(idAporte)).orElseThrow();
    assertThat(aporte.monto().montoComoTexto()).isEqualTo("150.00");
    assertThat(aporte.monto().moneda()).isEqualTo("BOB");
    assertThat(aporte.registradoEn()).isEqualTo(AHORA);

    assertThat(almacen.eventosPublicados()).hasSize(1);
    AporteRealizado evento = (AporteRealizado) almacen.eventosPublicados().getFirst();
    assertThat(evento.idAporte().valor()).isEqualTo(idAporte);
    // Ya publicados, el agregado no los conserva: no se publican dos veces.
    assertThat(aporte.eventosDeDominio()).isEmpty();
  }

  @Test
  void unMensajeSoloConEspaciosSeGuardaComoSinMensaje() {
    almacen.guardar(campanaPublicada());

    UUID idAporte = manejador.handle(comando("20", "   ", true));

    Aporte aporte = almacen.buscarPorId(new IdAporte(idAporte)).orElseThrow();
    assertThat(aporte.mensajeApoyo()).isEmpty();
    assertThat(aporte.nombreAportante()).isEmpty();
  }

  @Test
  void siLaCampanaNoEstaEnLaProyeccionNoSePuedeAportar() {
    assertThatThrownBy(() -> manejador.handle(comando("150.00", null, false)))
        .isInstanceOf(RecursoNoEncontradoExcepcion.class)
        .extracting(error -> ((RecursoNoEncontradoExcepcion) error).codigo())
        .isEqualTo("campana-no-encontrada");
    assertThat(almacen.aportes()).isEmpty();
    assertThat(almacen.eventosPublicados()).isEmpty();
  }

  @Test
  void unaCampanaCerradaRechazaElAporteYNoPublicaNada() {
    almacen.guardar(campanaCerrada(ID_CAMPANA, EstadoCampanaAportable.FINALIZADA));

    assertThatThrownBy(() -> manejador.handle(comando("150.00", null, false)))
        .isInstanceOf(ExcepcionReglaDeNegocio.class)
        .extracting(error -> ((ExcepcionReglaDeNegocio) error).codigo())
        .isEqualTo("campana-no-acepta-aportes");
    assertThat(almacen.aportes()).isEmpty();
    assertThat(almacen.eventosPublicados()).isEmpty();
  }

  @Test
  void unMontoMalFormadoSeRechazaAntesDeBuscarLaCampana() {
    assertThatThrownBy(() -> manejador.handle(comando("ciento cincuenta", null, false)))
        .isInstanceOf(ExcepcionReglaDeNegocio.class)
        .extracting(error -> ((ExcepcionReglaDeNegocio) error).codigo())
        .isEqualTo("monto-invalido");
  }

  private static RealizarAporteComando comando(String monto, String mensaje, boolean esAnonimo) {
    return new RealizarAporteComando(
        ID_CAMPANA, ID_APORTANTE, "Ana Pérez", monto, "BOB", mensaje, esAnonimo);
  }
}
