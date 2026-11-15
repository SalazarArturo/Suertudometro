package com.crowdfunding.contribution.sharedkernel;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

class DineroTest {

  @Test
  void guardaElMontoConDosDecimales() {
    assertThat(Dinero.de("150", "BOB").montoComoTexto()).isEqualTo("150.00");
    assertThat(Dinero.de("150.5", "BOB").montoComoTexto()).isEqualTo("150.50");
    assertThat(Dinero.de(" 150.00 ", "BOB").montoComoTexto()).isEqualTo("150.00");
  }

  @Test
  void dosMontosIgualesSonElMismoDinero() {
    assertThat(Dinero.de("150", "BOB")).isEqualTo(new Dinero(new BigDecimal("150.00"), "BOB"));
  }

  @Test
  void aceptaElMaximoQueCabeEnLaColumna() {
    assertThat(Dinero.de("9999999999.99", "BOB").monto()).isEqualByComparingTo("9999999999.99");
  }

  @ParameterizedTest
  @NullSource
  @ValueSource(
      strings = {"", "abc", "-5.00", "150.123", "1e3", "150,50", "10000000000.00", "1.", ".5"})
  void rechazaUnMontoMalFormado(String monto) {
    assertThatThrownBy(() -> Dinero.de(monto, "BOB"))
        .isInstanceOf(ExcepcionReglaDeNegocio.class)
        .extracting(error -> ((ExcepcionReglaDeNegocio) error).codigo())
        .isEqualTo("monto-invalido");
  }

  @ParameterizedTest
  @NullSource
  @ValueSource(strings = {"", "bob", "BO", "BOBS", "B0B"})
  void rechazaUnaMonedaMalFormada(String moneda) {
    assertThatThrownBy(() -> Dinero.de("150.00", moneda))
        .isInstanceOf(ExcepcionReglaDeNegocio.class)
        .extracting(error -> ((ExcepcionReglaDeNegocio) error).codigo())
        .isEqualTo("moneda-invalida");
  }

  @Test
  void sabeSiEsMayorQueCero() {
    assertThat(Dinero.de("0.01", "BOB").esMayorQueCero()).isTrue();
    assertThat(Dinero.de("0.00", "BOB").esMayorQueCero()).isFalse();
  }
}
