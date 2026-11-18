package com.crowdfunding.campaign.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "eventos_procesados")
public class EventoProcesadoJpaEntity {

  @Id
  @Column(name = "id_evento", nullable = false, updatable = false)
  private UUID idEvento;

  @Column(name = "tipo_evento", nullable = false, length = 60)
  private String tipoEvento;

  @Column(name = "id_referencia")
  private UUID idReferencia;

  @Column(name = "procesado_en", nullable = false, updatable = false)
  private Instant procesadoEn;

  protected EventoProcesadoJpaEntity() {}

  public EventoProcesadoJpaEntity(
      UUID idEvento, String tipoEvento, UUID idReferencia, Instant procesadoEn) {
    this.idEvento = idEvento;
    this.tipoEvento = tipoEvento;
    this.idReferencia = idReferencia;
    this.procesadoEn = procesadoEn;
  }

  public UUID obtenerIdEvento() {
    return idEvento;
  }

  public String obtenerTipoEvento() {
    return tipoEvento;
  }

  public UUID obtenerIdReferencia() {
    return idReferencia;
  }

  public Instant obtenerProcesadoEn() {
    return procesadoEn;
  }
}
