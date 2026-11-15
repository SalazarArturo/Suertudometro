package com.crowdfunding.contribution.infrastructure.persistence;

import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

/** Fila de la tabla {@code campanas_aportables}: la proyección local de las campañas. */
@Entity
@Table(name = "campanas_aportables")
public class CampanaAportableJpaEntity {

  @Id
  @Column(name = "id_campana")
  private UUID idCampana;

  @Column(name = "id_organizador")
  private UUID idOrganizador;

  @Column(name = "titulo")
  private String titulo;

  @Column(name = "moneda", length = 3)
  private String moneda;

  @Column(name = "fecha_limite")
  private Instant fechaLimite;

  @Enumerated(EnumType.STRING)
  @Column(name = "estado", nullable = false, length = 20)
  private EstadoCampanaAportable estado;

  @Column(name = "actualizado_en", nullable = false)
  private Instant actualizadoEn;

  /** Lo exige JPA. */
  protected CampanaAportableJpaEntity() {}

  public CampanaAportableJpaEntity(
      UUID idCampana,
      UUID idOrganizador,
      String titulo,
      String moneda,
      Instant fechaLimite,
      EstadoCampanaAportable estado,
      Instant actualizadoEn) {
    this.idCampana = idCampana;
    this.idOrganizador = idOrganizador;
    this.titulo = titulo;
    this.moneda = moneda;
    this.fechaLimite = fechaLimite;
    this.estado = estado;
    this.actualizadoEn = actualizadoEn;
  }

  public UUID getIdCampana() {
    return idCampana;
  }

  public UUID getIdOrganizador() {
    return idOrganizador;
  }

  public String getTitulo() {
    return titulo;
  }

  public String getMoneda() {
    return moneda;
  }

  public Instant getFechaLimite() {
    return fechaLimite;
  }

  public EstadoCampanaAportable getEstado() {
    return estado;
  }

  public Instant getActualizadoEn() {
    return actualizadoEn;
  }
}
