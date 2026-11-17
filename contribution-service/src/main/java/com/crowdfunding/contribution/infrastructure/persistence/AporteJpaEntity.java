package com.crowdfunding.contribution.infrastructure.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Fila de la tabla {@code aportes}. Es el modelo de JPA, separado del agregado {@code Aporte}: el
 * dominio no lleva anotaciones de persistencia y {@link AporteMapper} convierte entre los dos.
 */
@Entity
@Table(name = "aportes")
public class AporteJpaEntity {

  @Id private UUID id;

  @Column(name = "id_campana", nullable = false)
  private UUID idCampana;

  @Column(name = "id_aportante", nullable = false)
  private UUID idAportante;

  @Column(name = "nombre_aportante", length = 100)
  private String nombreAportante;

  @Column(name = "es_anonimo", nullable = false)
  private boolean esAnonimo;

  @Column(name = "monto", nullable = false, precision = 12, scale = 2)
  private BigDecimal monto;

  @Column(name = "moneda", nullable = false, length = 3)
  private String moneda;

  @Column(name = "mensaje_apoyo", length = 300)
  private String mensajeApoyo;

  @Column(name = "registrado_en", nullable = false)
  private Instant registradoEn;

  /** Lo exige JPA. */
  protected AporteJpaEntity() {}

  public AporteJpaEntity(
      UUID id,
      UUID idCampana,
      UUID idAportante,
      String nombreAportante,
      boolean esAnonimo,
      BigDecimal monto,
      String moneda,
      String mensajeApoyo,
      Instant registradoEn) {
    this.id = id;
    this.idCampana = idCampana;
    this.idAportante = idAportante;
    this.nombreAportante = nombreAportante;
    this.esAnonimo = esAnonimo;
    this.monto = monto;
    this.moneda = moneda;
    this.mensajeApoyo = mensajeApoyo;
    this.registradoEn = registradoEn;
  }

  public UUID getId() {
    return id;
  }

  public UUID getIdCampana() {
    return idCampana;
  }

  public UUID getIdAportante() {
    return idAportante;
  }

  public String getNombreAportante() {
    return nombreAportante;
  }

  public boolean esAnonimo() {
    return esAnonimo;
  }

  public BigDecimal getMonto() {
    return monto;
  }

  public String getMoneda() {
    return moneda;
  }

  public String getMensajeApoyo() {
    return mensajeApoyo;
  }

  public Instant getRegistradoEn() {
    return registradoEn;
  }
}
