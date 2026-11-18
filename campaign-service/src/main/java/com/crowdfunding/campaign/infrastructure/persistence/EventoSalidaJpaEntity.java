package com.crowdfunding.campaign.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "eventos_salida")
public class EventoSalidaJpaEntity {

  @Id
  @Column(name = "id_evento", nullable = false, updatable = false)
  private UUID idEvento;

  @Column(name = "tipo_evento", nullable = false, length = 60)
  private String tipoEvento;

  @Column(name = "routing_key", nullable = false, length = 80)
  private String routingKey;

  @Column(name = "contenido", nullable = false, columnDefinition = "TEXT")
  private String contenido;

  @Column(name = "ocurrido_en", nullable = false, updatable = false)
  private Instant ocurridoEn;

  @Column(name = "publicado_en")
  private Instant publicadoEn;

  protected EventoSalidaJpaEntity() {}

  public EventoSalidaJpaEntity(
      UUID idEvento, String tipoEvento, String routingKey, String contenido, Instant ocurridoEn) {
    this.idEvento = idEvento;
    this.tipoEvento = tipoEvento;
    this.routingKey = routingKey;
    this.contenido = contenido;
    this.ocurridoEn = ocurridoEn;
  }

  public void marcarComoPublicado(Instant momento) {
    this.publicadoEn = momento;
  }

  public UUID obtenerIdEvento() {
    return idEvento;
  }

  public String obtenerTipoEvento() {
    return tipoEvento;
  }

  public String obtenerRoutingKey() {
    return routingKey;
  }

  public String obtenerContenido() {
    return contenido;
  }

  public Instant obtenerOcurridoEn() {
    return ocurridoEn;
  }

  public Instant obtenerPublicadoEn() {
    return publicadoEn;
  }
}
