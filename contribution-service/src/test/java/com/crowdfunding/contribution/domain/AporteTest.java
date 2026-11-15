package com.crowdfunding.contribution.domain;

import static com.crowdfunding.contribution.soporte.Ejemplos.AHORA;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_APORTANTE;
import static com.crowdfunding.contribution.soporte.Ejemplos.ID_CAMPANA;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaCerrada;
import static com.crowdfunding.contribution.soporte.Ejemplos.campanaPublicada;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crowdfunding.contribution.domain.event.AporteRealizado;
import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.Dinero;
import com.crowdfunding.contribution.sharedkernel.ExcepcionReglaDeNegocio;
import java.lang.reflect.Field;
import java.lang.reflect.Modifier;
import java.util.Arrays;
import org.assertj.core.api.ThrowableAssert.ThrowingCallable;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;

class AporteTest {

  private static final IdAportante APORTANTE = new IdAportante(ID_APORTANTE);
  private static final NombreAportante ANA = new NombreAportante("Ana Pérez");
  private static final Dinero CIENTO_CINCUENTA = Dinero.de("150.00", "BOB");
  private static final MensajeApoyo MENSAJE = new MensajeApoyo("¡Mucho éxito con la campaña!");

  @Test
  void registraUnAporteConNombreYMensaje() {
    Aporte aporte =
        Aporte.registrar(
            campanaPublicada(), APORTANTE, ANA, CIENTO_CINCUENTA, MENSAJE, false, AHORA);

    assertThat(aporte.id()).isNotNull();
    assertThat(aporte.idCampana()).isEqualTo(new IdCampana(ID_CAMPANA));
    assertThat(aporte.idAportante()).isEqualTo(APORTANTE);
    assertThat(aporte.nombreAportante()).hasValue(ANA);
    assertThat(aporte.esAnonimo()).isFalse();
    assertThat(aporte.monto()).isEqualTo(CIENTO_CINCUENTA);
    assertThat(aporte.mensajeApoyo()).hasValue(MENSAJE);
    assertThat(aporte.registradoEn()).isEqualTo(AHORA);
  }

  @Test
  void produceElEventoAporteRealizado() {
    Aporte aporte =
        Aporte.registrar(
            campanaPublicada(), APORTANTE, ANA, CIENTO_CINCUENTA, MENSAJE, false, AHORA);

    assertThat(aporte.eventosDeDominio()).hasSize(1);
    AporteRealizado evento = (AporteRealizado) aporte.eventosDeDominio().getFirst();
    assertThat(evento.idEvento()).isNotNull();
    assertThat(evento.ocurridoEn()).isEqualTo(AHORA);
    assertThat(evento.idAporte()).isEqualTo(aporte.id());
    assertThat(evento.idCampana()).isEqualTo(aporte.idCampana());
    assertThat(evento.idAportante()).isEqualTo(APORTANTE);
    assertThat(evento.nombreAportante()).hasValue(ANA);
    assertThat(evento.esAnonimo()).isFalse();
    assertThat(evento.monto()).isEqualTo(CIENTO_CINCUENTA);
    assertThat(evento.mensajeApoyo()).hasValue(MENSAJE);
  }

  @Test
  void unAporteAnonimoNoGuardaElNombre() {
    Aporte aporte =
        Aporte.registrar(campanaPublicada(), APORTANTE, ANA, CIENTO_CINCUENTA, null, true, AHORA);

    assertThat(aporte.esAnonimo()).isTrue();
    assertThat(aporte.nombreAportante()).isEmpty();
    // El aportante sí queda identificado: sirve para "Mis aportes" y para avisarle de novedades.
    assertThat(aporte.idAportante()).isEqualTo(APORTANTE);

    AporteRealizado evento = (AporteRealizado) aporte.eventosDeDominio().getFirst();
    assertThat(evento.esAnonimo()).isTrue();
    assertThat(evento.nombreAportante()).isEmpty();
  }

  @Test
  void elMensajeDeApoyoEsOpcional() {
    Aporte aporte =
        Aporte.registrar(campanaPublicada(), APORTANTE, ANA, CIENTO_CINCUENTA, null, false, AHORA);

    assertThat(aporte.mensajeApoyo()).isEmpty();
  }

  @Test
  void rechazaUnMontoDeCero() {
    assertReglaIncumplida(
        "monto-invalido",
        () ->
            Aporte.registrar(
                campanaPublicada(), APORTANTE, ANA, Dinero.de("0.00", "BOB"), null, false, AHORA));
  }

  @Test
  void rechazaUnaMonedaDistintaDeLaDeLaCampana() {
    assertReglaIncumplida(
        "moneda-distinta-de-la-campana",
        () ->
            Aporte.registrar(
                campanaPublicada(),
                APORTANTE,
                ANA,
                Dinero.de("150.00", "USD"),
                null,
                false,
                AHORA));
  }

  @ParameterizedTest
  @EnumSource(
      value = EstadoCampanaAportable.class,
      names = {"FINALIZADA", "CANCELADA"})
  void rechazaAportesAUnaCampanaCerrada(EstadoCampanaAportable estadoFinal) {
    CampanaAportable cerrada = campanaCerrada(ID_CAMPANA, estadoFinal);

    assertReglaIncumplida(
        "campana-no-acepta-aportes",
        () -> Aporte.registrar(cerrada, APORTANTE, ANA, CIENTO_CINCUENTA, null, false, AHORA));
  }

  @Test
  void rechazaUnAporteSinAportante() {
    assertReglaIncumplida(
        "aportante-requerido",
        () ->
            Aporte.registrar(campanaPublicada(), null, ANA, CIENTO_CINCUENTA, null, false, AHORA));
  }

  @Test
  void unAporteConNombreNecesitaElNombre() {
    assertReglaIncumplida(
        "nombre-aportante-invalido",
        () ->
            Aporte.registrar(
                campanaPublicada(), APORTANTE, null, CIENTO_CINCUENTA, null, false, AHORA));
  }

  @Test
  void unAporteRegistradoNoSePuedeModificar() {
    // R7: todos los atributos son finales y la clase no tiene métodos que los cambien.
    assertThat(Arrays.stream(Aporte.class.getDeclaredFields()).map(Field::getModifiers))
        .allMatch(Modifier::isFinal);
  }

  private static void assertReglaIncumplida(String codigo, ThrowingCallable accion) {
    assertThatThrownBy(accion)
        .isInstanceOf(ExcepcionReglaDeNegocio.class)
        .extracting(error -> ((ExcepcionReglaDeNegocio) error).codigo())
        .isEqualTo(codigo);
  }
}
