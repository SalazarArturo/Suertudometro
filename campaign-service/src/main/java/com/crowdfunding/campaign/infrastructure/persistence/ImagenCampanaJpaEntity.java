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
@Table(name = "imagenes_campana")
public class ImagenCampanaJpaEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @ManyToOne(fetch = FetchType.LAZY)
  @JoinColumn(name = "id_campana", nullable = false)
  private CampanaJpaEntity campana;

  @Column(name = "url_publica", nullable = false, length = 255)
  private String urlPublica;

  @Column(name = "nombre_original", nullable = false, length = 255)
  private String nombreOriginal;

  @Column(name = "tipo_mime", nullable = false, length = 50)
  private String tipoMime;

  @Column(name = "tamano_bytes", nullable = false)
  private long tamanoBytes;

  @Column(name = "orden", nullable = false)
  private int orden;

  @Column(name = "es_portada", nullable = false)
  private boolean esPortada;

  @Column(name = "fecha_subida", nullable = false)
  private Instant fechaSubida;

  protected ImagenCampanaJpaEntity() {}

  public ImagenCampanaJpaEntity(
      UUID id,
      String urlPublica,
      String nombreOriginal,
      String tipoMime,
      long tamanoBytes,
      int orden,
      boolean esPortada,
      Instant fechaSubida) {
    this.id = id;
    this.urlPublica = urlPublica;
    this.nombreOriginal = nombreOriginal;
    this.tipoMime = tipoMime;
    this.tamanoBytes = tamanoBytes;
    this.orden = orden;
    this.esPortada = esPortada;
    this.fechaSubida = fechaSubida;
  }

  public void asignarCampana(CampanaJpaEntity campana) {
    this.campana = campana;
  }

  public UUID obtenerId() {
    return id;
  }

  public String obtenerUrlPublica() {
    return urlPublica;
  }

  public String obtenerNombreOriginal() {
    return nombreOriginal;
  }

  public String obtenerTipoMime() {
    return tipoMime;
  }

  public long obtenerTamanoBytes() {
    return tamanoBytes;
  }

  public int obtenerOrden() {
    return orden;
  }

  public boolean esPortada() {
    return esPortada;
  }

  public Instant obtenerFechaSubida() {
    return fechaSubida;
  }
}
