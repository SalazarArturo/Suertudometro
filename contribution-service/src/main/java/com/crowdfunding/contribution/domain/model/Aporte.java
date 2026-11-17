package com.crowdfunding.contribution.domain.model;

import com.crowdfunding.contribution.domain.event.AporteRealizado;
import com.crowdfunding.contribution.domain.rule.AporteConNombreDebeTenerNombreAportanteRegla;
import com.crowdfunding.contribution.domain.rule.AporteDebeTenerAportanteRegla;
import com.crowdfunding.contribution.domain.rule.CampanaDebeAceptarAportesRegla;
import com.crowdfunding.contribution.domain.rule.MonedaDelAporteDebeSerLaDeLaCampanaRegla;
import com.crowdfunding.contribution.domain.rule.MontoDeAporteDebeSerMayorQueCeroRegla;
import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.Dinero;
import com.crowdfunding.contribution.sharedkernel.RaizDeAgregado;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Agregado raíz: un aporte simulado a una campaña publicada.
 *
 * <p>No tiene estados ni métodos que lo cambien. Nace registrado y queda así (R7), porque es un
 * registro de dinero y campaign-service ya lo sumó al monto recaudado.
 */
public final class Aporte extends RaizDeAgregado<IdAporte> {

  private final IdCampana idCampana;
  private final IdAportante idAportante;
  private final NombreAportante nombreAportante;
  private final boolean esAnonimo;
  private final Dinero monto;
  private final MensajeApoyo mensajeApoyo;
  private final Instant registradoEn;

  private Aporte(
      IdAporte id,
      IdCampana idCampana,
      IdAportante idAportante,
      NombreAportante nombreAportante,
      boolean esAnonimo,
      Dinero monto,
      MensajeApoyo mensajeApoyo,
      Instant registradoEn) {
    super(id);
    this.idCampana = Objects.requireNonNull(idCampana);
    this.idAportante = Objects.requireNonNull(idAportante);
    this.nombreAportante = nombreAportante;
    this.esAnonimo = esAnonimo;
    this.monto = Objects.requireNonNull(monto);
    this.mensajeApoyo = mensajeApoyo;
    this.registradoEn = Objects.requireNonNull(registradoEn);
  }

  /**
   * Método de fábrica: la única forma de crear un aporte nuevo. Verifica las reglas y produce el
   * evento de dominio {@link AporteRealizado}.
   *
   * @param nombreAportante el nombre de la cuenta; en un aporte anónimo se descarta (R6)
   * @param mensajeApoyo el mensaje de apoyo, o {@code null} si el aporte no lleva mensaje
   * @param ahora el instante del aporte, que fija el servicio
   */
  public static Aporte registrar(
      CampanaAportable campana,
      IdAportante idAportante,
      NombreAportante nombreAportante,
      Dinero monto,
      MensajeApoyo mensajeApoyo,
      boolean esAnonimo,
      Instant ahora) {
    verificarRegla(new AporteDebeTenerAportanteRegla(idAportante)); // R5
    verificarRegla(new MontoDeAporteDebeSerMayorQueCeroRegla(monto)); // R1
    verificarRegla(new CampanaDebeAceptarAportesRegla(campana)); // R3
    verificarRegla(new MonedaDelAporteDebeSerLaDeLaCampanaRegla(monto, campana)); // R2
    verificarRegla(new AporteConNombreDebeTenerNombreAportanteRegla(esAnonimo, nombreAportante));

    // R6: un aporte anónimo no guarda el nombre, así que no hay forma de mostrarlo por error.
    NombreAportante nombreVisible = esAnonimo ? null : nombreAportante;
    Aporte aporte =
        new Aporte(
            IdAporte.nuevo(),
            campana.idCampana(),
            idAportante,
            nombreVisible,
            esAnonimo,
            monto,
            mensajeApoyo,
            ahora);
    aporte.registrarEvento(
        new AporteRealizado(
            UUID.randomUUID(),
            ahora,
            aporte.id(),
            aporte.idCampana,
            aporte.idAportante,
            aporte.nombreAportante(),
            aporte.esAnonimo,
            aporte.monto,
            aporte.mensajeApoyo()));
    return aporte;
  }

  /** Reconstruye un aporte guardado, sin reglas ni eventos. Solo la usa el mapper. */
  public static Aporte reconstituir(
      IdAporte id,
      IdCampana idCampana,
      IdAportante idAportante,
      NombreAportante nombreAportante,
      boolean esAnonimo,
      Dinero monto,
      MensajeApoyo mensajeApoyo,
      Instant registradoEn) {
    return new Aporte(
        id, idCampana, idAportante, nombreAportante, esAnonimo, monto, mensajeApoyo, registradoEn);
  }

  public IdCampana idCampana() {
    return idCampana;
  }

  public IdAportante idAportante() {
    return idAportante;
  }

  /** Vacío si el aporte es anónimo (R6). */
  public Optional<NombreAportante> nombreAportante() {
    return Optional.ofNullable(nombreAportante);
  }

  public boolean esAnonimo() {
    return esAnonimo;
  }

  public Dinero monto() {
    return monto;
  }

  /** Vacío si el aporte no lleva mensaje (R4). */
  public Optional<MensajeApoyo> mensajeApoyo() {
    return Optional.ofNullable(mensajeApoyo);
  }

  public Instant registradoEn() {
    return registradoEn;
  }
}
