package com.crowdfunding.contribution.infrastructure.messaging;

import com.crowdfunding.contribution.domain.event.AporteRealizado;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import java.util.UUID;

/**
 * {@code datos} del evento de integración {@code AporteRegistrado} ({@code aporte.registrado}).
 * Tiene exactamente los campos de su ficha en docs/contratos-de-eventos.md; cambiar uno es cambiar
 * el contrato, y eso se hace por PR con los consumidores (campaign, search y notification).
 *
 * @param monto el importe de esa operación, como texto con dos decimales
 * @param nombreAportante {@code null} cuando {@code esAnonimo} es verdadero
 * @param mensajeApoyo {@code null} si el aporte no lleva mensaje
 */
public record AporteRegistrado(
    UUID idAporte,
    UUID idCampana,
    String monto,
    String moneda,
    UUID idAportante,
    boolean esAnonimo,
    String nombreAportante,
    String mensajeApoyo) {

  public static final String TIPO_EVENTO = "aporte.registrado";
  public static final int VERSION = 1;

  /** Traduce el evento de dominio al evento de integración, ya dentro de su sobre. */
  public static SobreEvento<AporteRegistrado> desde(AporteRealizado evento) {
    AporteRegistrado datos =
        new AporteRegistrado(
            evento.idAporte().valor(),
            evento.idCampana().valor(),
            evento.monto().montoComoTexto(),
            evento.monto().moneda(),
            evento.idAportante().valor(),
            evento.esAnonimo(),
            evento.nombreAportante().map(NombreAportante::valor).orElse(null),
            evento.mensajeApoyo().map(MensajeApoyo::texto).orElse(null));
    return new SobreEvento<>(
        evento.idEvento(), TIPO_EVENTO, VERSION, evento.ocurridoEn().toString(), datos);
  }
}
