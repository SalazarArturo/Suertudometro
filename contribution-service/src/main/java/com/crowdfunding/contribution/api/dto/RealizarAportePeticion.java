package com.crowdfunding.contribution.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

/**
 * Cuerpo de {@code POST /api/aportes}. Aquí solo se revisa la forma (que estén los campos); las
 * reglas (monto mayor que cero, 300 caracteres, moneda de la campaña) las decide el dominio.
 *
 * @param monto el dinero viaja como texto, por ejemplo {@code "150.00"}, nunca como número decimal
 * @param mensajeApoyo opcional
 * @param esAnonimo opcional; si no se envía, el aporte se muestra con nombre
 */
public record RealizarAportePeticion(
    @NotNull(message = "El id de la campaña es obligatorio.") UUID idCampana,
    @NotBlank(message = "El monto es obligatorio.") String monto,
    @NotBlank(message = "La moneda es obligatoria.") String moneda,
    String mensajeApoyo,
    Boolean esAnonimo) {

  /** Verdadero solo si el aportante pidió expresamente aportar como anónimo. */
  public boolean aportaComoAnonimo() {
    return Boolean.TRUE.equals(esAnonimo);
  }
}
