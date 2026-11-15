package com.crowdfunding.contribution.api.dto;

import com.crowdfunding.contribution.application.query.AporteVista;
import java.time.Instant;
import java.util.UUID;

/**
 * Un aporte en las respuestas del API. No incluye el id del aportante: es un dato interno, y así un
 * aporte anónimo nunca identifica a quien lo hizo.
 *
 * @param monto texto con dos decimales, por ejemplo {@code "150.00"}
 * @param nombreAportante {@code null} si el aporte es anónimo
 * @param mensajeApoyo {@code null} si el aporte no lleva mensaje
 * @param registradoEn instante en ISO 8601 UTC
 */
public record AporteRespuesta(
    UUID idAporte,
    UUID idCampana,
    String tituloCampana,
    String monto,
    String moneda,
    boolean esAnonimo,
    String nombreAportante,
    String mensajeApoyo,
    Instant registradoEn) {

  public static AporteRespuesta desde(AporteVista aporte) {
    return new AporteRespuesta(
        aporte.idAporte(),
        aporte.idCampana(),
        aporte.tituloCampana(),
        aporte.monto().montoComoTexto(),
        aporte.monto().moneda(),
        aporte.esAnonimo(),
        aporte.nombreAportante(),
        aporte.mensajeApoyo(),
        aporte.registradoEn());
  }
}
