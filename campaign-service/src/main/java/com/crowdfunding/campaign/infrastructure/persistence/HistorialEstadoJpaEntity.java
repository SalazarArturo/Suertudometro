package com.crowdfunding.campaign.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "historial_estados_campana")
public class HistorialEstadoJpaEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "id_campana", nullable = false)
  private CampanaJpaEntity campana;

  @Column(name = "estado_anterior", length = 20)
  private String estadoAnterior;

  @Column(name = "estado_nuevo", nullable = false, length = 20)
  private String estadoNuevo;

  @Column(name = "id_actor")
  private UUID idActor;

  @Column(name = "motivo", nullable = false, columnDefinition = "TEXT")
  private String motivo;

  @Column(name = "fecha_transicion", nullable = false)
  private Instant fechaTransicion;

  protected HistorialEstadoJpaEntity() {}

  public HistorialEstadoJpaEntity(
      UUID id,
      String estadoAnterior,
      String estadoNuevo,
      UUID idActor,
      String motivo,
      Instant fechaTransicion) {
    this.id = id;
    this.estadoAnterior = estadoAnterior;
    this.estadoNuevo = estadoNuevo;
    this.idActor = idActor;
    this.motivo = motivo;
    this.fechaTransicion = fechaTransicion;
  }

  public void asignarCampana(CampanaJpaEntity campana) {
    this.campana = campana;
  }

  public UUID obtenerId() {
    return id;
  }

  public String obtenerEstadoAnterior() {
    return estadoAnterior;
  }

  public String obtenerEstadoNuevo() {
    return estadoNuevo;
  }

  public UUID obtenerIdActor() {
    return idActor;
  }

  public String obtenerMotivo() {
    return motivo;
  }

  public Instant obtenerFechaTransicion() {
    return fechaTransicion;
  }
}
