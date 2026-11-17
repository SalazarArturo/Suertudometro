package com.crowdfunding.contribution.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Fila de la tabla {@code eventos_procesados}: un evento recibido que ya se aplicó. */
@Entity
@Table(name = "eventos_procesados")
public class EventoProcesadoJpaEntity {

  @Id
  @Column(name = "id_evento")
  private UUID idEvento;

  @Column(name = "tipo_evento", nullable = false, length = 60)
  private String tipoEvento;

  @Column(name = "procesado_en", nullable = false)
  private Instant procesadoEn;

  /** Lo exige JPA. */
  protected EventoProcesadoJpaEntity() {}

  public UUID getIdEvento() {
    return idEvento;
  }

  public String getTipoEvento() {
    return tipoEvento;
  }

  public Instant getProcesadoEn() {
    return procesadoEn;
  }
}
