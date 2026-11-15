package com.crowdfunding.contribution.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Fila de la tabla outbox {@code eventos_salida}: un evento de integración que espera su envío a
 * RabbitMQ. {@code contenido} guarda el sobre completo del mensaje, tal como sale al bus.
 */
@Entity
@Table(name = "eventos_salida")
public class EventoSalidaJpaEntity {

  @Id
  @Column(name = "id_evento")
  private UUID idEvento;

  @Column(name = "tipo_evento", nullable = false, length = 60)
  private String tipoEvento;

  @JdbcTypeCode(SqlTypes.JSON)
  @Column(name = "contenido", nullable = false)
  private String contenido;

  @Column(name = "ocurrido_en", nullable = false)
  private Instant ocurridoEn;

  /** {@code null} mientras el evento está pendiente de envío. */
  @Column(name = "publicado_en")
  private Instant publicadoEn;

  /** Lo exige JPA. */
  protected EventoSalidaJpaEntity() {}

  public EventoSalidaJpaEntity(
      UUID idEvento, String tipoEvento, String contenido, Instant ocurridoEn) {
    this.idEvento = idEvento;
    this.tipoEvento = tipoEvento;
    this.contenido = contenido;
    this.ocurridoEn = ocurridoEn;
  }

  public void marcarPublicado(Instant ahora) {
    this.publicadoEn = ahora;
  }

  public UUID getIdEvento() {
    return idEvento;
  }

  public String getTipoEvento() {
    return tipoEvento;
  }

  public String getContenido() {
    return contenido;
  }

  public Instant getOcurridoEn() {
    return ocurridoEn;
  }

  public Instant getPublicadoEn() {
    return publicadoEn;
  }
}
