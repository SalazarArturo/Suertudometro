package com.crowdfunding.campaign.sharedkernel;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

public record Dinero(BigDecimal monto, String moneda) implements ObjetoDeValor {

  public static final String MONEDA_BOB = "BOB";
  public static final BigDecimal MAXIMO_PERMITIDO = new BigDecimal("9999999999.99");

  public Dinero {

    Objects.requireNonNull(monto, "El monto no puede ser nulo");
    Objects.requireNonNull(moneda, "La moneda no puede ser nula");
    if (monto.scale() > 2) {
      throw new IllegalArgumentException("El monto no puede tener mas de 2 decimales");
    }
    monto = monto.setScale(2, RoundingMode.UNNECESSARY);
    if (monto.compareTo(BigDecimal.ZERO) < 0) {
      throw new IllegalArgumentException("El monto no puede ser negativo");
    }
    if (monto.compareTo(MAXIMO_PERMITIDO) > 0) {
      throw new IllegalArgumentException("El monto supera el maximo permitido de NUMERIC(12,2)");
    }
    moneda = moneda.trim().toUpperCase();
    if (!MONEDA_BOB.equals(moneda)) {
      throw new IllegalArgumentException("La unica moneda soportada en v1 es BOB");
    }
  }

  public static Dinero de(String montoTexto, String moneda) {
    Objects.requireNonNull(montoTexto, "El monto en texto no puede ser nulo");
    try {
      return new Dinero(new BigDecimal(montoTexto.trim()), moneda);
    } catch (NumberFormatException ex) {
      throw new IllegalArgumentException("Formato de monto invalido: " + montoTexto, ex);
    }
  }

  public static Dinero ceroBob() {
    return new Dinero(BigDecimal.ZERO.setScale(2, RoundingMode.UNNECESSARY), MONEDA_BOB);
  }

  public Dinero sumar(Dinero otro) {
    Objects.requireNonNull(otro, "El monto a sumar no puede ser nulo");
    if (!this.moneda.equals(otro.moneda)) {
      throw new IllegalArgumentException("No se pueden sumar montos de distinta moneda");
    }
    return new Dinero(this.monto.add(otro.monto), this.moneda);
  }

  public boolean esMayorOIgualQue(Dinero otro) {
    Objects.requireNonNull(otro, "El monto a comparar no puede ser nulo");
    if (!this.moneda.equals(otro.moneda)) {
      throw new IllegalArgumentException("No se pueden comparar montos de distinta moneda");
    }
    return this.monto.compareTo(otro.monto) >= 0;
  }

  public boolean esMayorQueCero() {
    return this.monto.compareTo(BigDecimal.ZERO) > 0;
  }

  public String comoTexto() {
    return this.monto.toPlainString();
  }
}
