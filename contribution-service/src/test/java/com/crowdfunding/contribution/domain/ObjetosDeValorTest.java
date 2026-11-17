package com.crowdfunding.contribution.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.ExcepcionReglaDeNegocio;
import org.junit.jupiter.api.Test;

class ObjetosDeValorTest {

  @Test
  void unMensajeVacioSignificaSinMensaje() {
    assertThat(MensajeApoyo.desdeTexto(null)).isEmpty();
    assertThat(MensajeApoyo.desdeTexto("")).isEmpty();
    assertThat(MensajeApoyo.desdeTexto("   ")).isEmpty();
  }

  @Test
  void elMensajeSeGuardaSinEspaciosEnLosExtremos() {
    assertThat(MensajeApoyo.desdeTexto("  ¡Mucho éxito!  "))
        .hasValue(new MensajeApoyo("¡Mucho éxito!"));
  }

  @Test
  void elMensajeAdmiteHastaTrescientosCaracteres() {
    assertThat(MensajeApoyo.desdeTexto("a".repeat(300))).isPresent();

    assertThatThrownBy(() -> MensajeApoyo.desdeTexto("a".repeat(301)))
        .isInstanceOf(ExcepcionReglaDeNegocio.class)
        .extracting(error -> ((ExcepcionReglaDeNegocio) error).codigo())
        .isEqualTo("mensaje-apoyo-demasiado-largo");
  }

  @Test
  void unEmojiCuentaComoUnSoloCaracter() {
    // Cada emoji ocupa dos unidades UTF-16, pero es un solo carácter para la persona.
    assertThat(MensajeApoyo.desdeTexto("🎉".repeat(300))).isPresent();
  }

  @Test
  void elNombreDelAportanteEsObligatorio() {
    assertThat(new NombreAportante("  Ana Pérez ").valor()).isEqualTo("Ana Pérez");

    assertThatThrownBy(() -> new NombreAportante(" "))
        .isInstanceOf(ExcepcionReglaDeNegocio.class)
        .extracting(error -> ((ExcepcionReglaDeNegocio) error).codigo())
        .isEqualTo("nombre-aportante-invalido");
    assertThatThrownBy(() -> new NombreAportante("a".repeat(101)))
        .isInstanceOf(ExcepcionReglaDeNegocio.class);
  }

  @Test
  void cadaAporteNuevoTieneUnIdDistinto() {
    assertThat(IdAporte.nuevo()).isNotEqualTo(IdAporte.nuevo());
  }
}
