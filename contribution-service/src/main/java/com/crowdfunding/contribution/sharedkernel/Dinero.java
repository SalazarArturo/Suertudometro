package com.crowdfunding.contribution.sharedkernel;

import java.math.BigDecimal;
import java.util.regex.Pattern;

/**
 * Un monto con su moneda (docs/stack-y-convenciones.md §5.7). Siempre tiene dos decimales exactos:
 * usa {@link BigDecimal}, nunca {@code float} ni {@code double}.
 *
 * @param monto mayor o igual a cero, con dos decimales, y que cabe en {@code NUMERIC(12,2)}
 * @param moneda código ISO 4217, por ejemplo {@code BOB}
 */
public record Dinero(BigDecimal monto, String moneda) implements ObjetoDeValor {

  public static final String CODIGO_MONTO_INVALIDO = "monto-invalido";
  public static final String CODIGO_MONEDA_INVALIDA = "moneda-invalida";

  /** El mayor valor que cabe en una columna {@code NUMERIC(12,2)}. */
  public static final BigDecimal MONTO_MAXIMO = new BigDecimal("9999999999.99");

  /**
   * Solo dígitos, con uno o dos decimales opcionales: {@code 150}, {@code 150.5}, {@code 150.00}.
   */
  private static final Pattern FORMATO_MONTO = Pattern.compile("\\d{1,10}(\\.\\d{1,2})?");

  private static final Pattern FORMATO_MONEDA = Pattern.compile("[A-Z]{3}");

  public Dinero {
    if (monto == null
        || monto.signum() < 0
        || monto.scale() > 2
        || monto.compareTo(MONTO_MAXIMO) > 0) {
      throw new ExcepcionReglaDeNegocio(
          CODIGO_MONTO_INVALIDO,
          "El monto debe ser un número con dos decimales como máximo, por ejemplo 150.00.");
    }
    if (moneda == null || !FORMATO_MONEDA.matcher(moneda).matches()) {
      throw new ExcepcionReglaDeNegocio(
          CODIGO_MONEDA_INVALIDA,
          "La moneda debe ser un código de tres letras mayúsculas, por ejemplo BOB.");
    }
    monto = monto.setScale(2);
  }

  /** Crea el dinero a partir del texto que viaja en el API y en los eventos ({@code "150.00"}). */
  public static Dinero de(String monto, String moneda) {
    if (monto == null || !FORMATO_MONTO.matcher(monto.trim()).matches()) {
      throw new ExcepcionReglaDeNegocio(
          CODIGO_MONTO_INVALIDO,
          "El monto debe ser un número con dos decimales como máximo, por ejemplo 150.00.");
    }
    return new Dinero(new BigDecimal(monto.trim()), moneda);
  }

  public boolean esMayorQueCero() {
    return monto.signum() > 0;
  }

  public boolean esDeMoneda(String otraMoneda) {
    return moneda.equals(otraMoneda);
  }

  /** El monto como viaja en el API y en los eventos: texto con dos decimales ({@code "150.00"}). */
  public String montoComoTexto() {
    return monto.toPlainString();
  }
}
