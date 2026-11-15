package com.crowdfunding.contribution.domain.model;

import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.IdOrganizador;
import java.time.Instant;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

/**
 * Copia mínima de una campaña de campaign-service, alimentada por sus eventos {@code
 * campana.publicada} y {@code campana.cerrada}. Entre servicios no hay llamadas HTTP, así que con
 * esta proyección el servicio sabe por su cuenta si una campaña acepta aportes.
 *
 * <p>Los datos de la publicación pueden faltar: RabbitMQ no garantiza el orden, y si el cierre
 * llega antes que la publicación, la campaña se guarda cerrada y sin datos.
 */
public final class CampanaAportable {

  private final IdCampana idCampana;
  private IdOrganizador idOrganizador;
  private String titulo;
  private String moneda;
  private Instant fechaLimite;
  private EstadoCampanaAportable estado;
  private Instant actualizadoEn;

  private CampanaAportable(
      IdCampana idCampana,
      IdOrganizador idOrganizador,
      String titulo,
      String moneda,
      Instant fechaLimite,
      EstadoCampanaAportable estado,
      Instant actualizadoEn) {
    this.idCampana = Objects.requireNonNull(idCampana, "La campaña necesita un id");
    this.idOrganizador = idOrganizador;
    this.titulo = titulo;
    this.moneda = moneda;
    this.fechaLimite = fechaLimite;
    this.estado = Objects.requireNonNull(estado, "La campaña necesita un estado");
    this.actualizadoEn = Objects.requireNonNull(actualizadoEn, "Falta la fecha de actualización");
  }

  /** La campaña que anuncia {@code campana.publicada}: nace en PUBLICADA y acepta aportes. */
  public static CampanaAportable publicada(
      IdCampana idCampana,
      IdOrganizador idOrganizador,
      String titulo,
      String moneda,
      Instant fechaLimite,
      Instant ahora) {
    Objects.requireNonNull(idOrganizador, "Una campaña publicada tiene organizador");
    Objects.requireNonNull(titulo, "Una campaña publicada tiene título");
    Objects.requireNonNull(moneda, "Una campaña publicada tiene moneda");
    Objects.requireNonNull(fechaLimite, "Una campaña publicada tiene fecha límite");
    return new CampanaAportable(
        idCampana,
        idOrganizador,
        titulo,
        moneda,
        fechaLimite,
        EstadoCampanaAportable.PUBLICADA,
        ahora);
  }

  /** El cierre llegó antes que la publicación: se guarda cerrada para que nadie pueda aportar. */
  public static CampanaAportable cerradaAntesDePublicarse(
      IdCampana idCampana, EstadoCampanaAportable estadoFinal, Instant ahora) {
    exigirEstadoTerminal(estadoFinal);
    return new CampanaAportable(idCampana, null, null, null, null, estadoFinal, ahora);
  }

  /** Reconstruye la campaña desde la base de datos, sin aplicar reglas. Solo la usa el mapper. */
  public static CampanaAportable reconstituir(
      IdCampana idCampana,
      IdOrganizador idOrganizador,
      String titulo,
      String moneda,
      Instant fechaLimite,
      EstadoCampanaAportable estado,
      Instant actualizadoEn) {
    return new CampanaAportable(
        idCampana, idOrganizador, titulo, moneda, fechaLimite, estado, actualizadoEn);
  }

  /** R3: solo una campaña en PUBLICADA acepta aportes. */
  public boolean aceptaAportes() {
    return estado == EstadoCampanaAportable.PUBLICADA;
  }

  /**
   * Aplica una publicación que llega cuando la campaña ya existe. Completa los datos, pero no
   * cambia el estado: una campaña cerrada no se reabre.
   */
  public void registrarPublicacion(
      IdOrganizador idOrganizador,
      String titulo,
      String moneda,
      Instant fechaLimite,
      Instant ahora) {
    this.idOrganizador = Objects.requireNonNull(idOrganizador);
    this.titulo = Objects.requireNonNull(titulo);
    this.moneda = Objects.requireNonNull(moneda);
    this.fechaLimite = Objects.requireNonNull(fechaLimite);
    this.actualizadoEn = ahora;
  }

  /**
   * Cierra la campaña en FINALIZADA o en CANCELADA. Si ya estaba cerrada no cambia nada, porque los
   * estados terminales son inmutables.
   */
  public void cerrar(EstadoCampanaAportable estadoFinal, Instant ahora) {
    exigirEstadoTerminal(estadoFinal);
    if (estado.esTerminal()) {
      return;
    }
    this.estado = estadoFinal;
    this.actualizadoEn = ahora;
  }

  /** Verdadero si ese usuario es el organizador de la campaña. */
  public boolean esOrganizadaPor(UUID idUsuario) {
    return idOrganizador != null && idOrganizador.valor().equals(idUsuario);
  }

  private static void exigirEstadoTerminal(EstadoCampanaAportable estadoFinal) {
    if (estadoFinal == null || !estadoFinal.esTerminal()) {
      throw new IllegalArgumentException("Una campaña solo se cierra en FINALIZADA o en CANCELADA");
    }
  }

  public IdCampana idCampana() {
    return idCampana;
  }

  /** Vacío si el cierre llegó antes que la publicación. */
  public Optional<IdOrganizador> idOrganizador() {
    return Optional.ofNullable(idOrganizador);
  }

  /** {@code null} si el cierre llegó antes que la publicación. */
  public String titulo() {
    return titulo;
  }

  /** {@code null} si el cierre llegó antes que la publicación. */
  public String moneda() {
    return moneda;
  }

  /** Vacío si el cierre llegó antes que la publicación. */
  public Optional<Instant> fechaLimite() {
    return Optional.ofNullable(fechaLimite);
  }

  public EstadoCampanaAportable estado() {
    return estado;
  }

  public Instant actualizadoEn() {
    return actualizadoEn;
  }
}
