package com.crowdfunding.campaign.domain.model;

import com.crowdfunding.campaign.domain.valueobject.IdImagenCampana;
import java.time.Instant;
import java.util.Objects;
import java.util.Set;

public final class ImagenCampana {

  public static final long TAMANO_MAXIMO_BYTES = 5L * 1024L * 1024L; // 5 MB
  public static final Set<String> TIPOS_MIME_PERMITIDOS =
      Set.of("image/jpeg", "image/png", "image/webp");

  private final IdImagenCampana id;
  private final String urlPublica;
  private final String nombreOriginal;
  private final String tipoMime;
  private final long tamanoBytes;
  private int orden;
  private boolean esPortada;
  private final Instant fechaSubida;

  public ImagenCampana(
      IdImagenCampana id,
      String urlPublica,
      String nombreOriginal,
      String tipoMime,
      long tamanoBytes,
      int orden,
      boolean esPortada,
      Instant fechaSubida) {
    this.id = Objects.requireNonNull(id, "El id de la imagen es obligatorio");
    this.urlPublica =
        Objects.requireNonNull(urlPublica, "La URL publica de la imagen es obligatoria").trim();
    if (this.urlPublica.isEmpty()) {
      throw new IllegalArgumentException("La URL publica de la imagen no puede estar vacia");
    }
    this.nombreOriginal =
        Objects.requireNonNull(nombreOriginal, "El nombre original es obligatorio").trim();
    this.tipoMime =
        Objects.requireNonNull(tipoMime, "El tipo MIME es obligatorio").trim().toLowerCase();
    if (!TIPOS_MIME_PERMITIDOS.contains(this.tipoMime)) {
      throw new IllegalArgumentException(
          "Formato de imagen no permitido. Solo se aceptan JPEG, PNG o WEBP");
    }
    if (tamanoBytes <= 0 || tamanoBytes > TAMANO_MAXIMO_BYTES) {
      throw new IllegalArgumentException("El tamano de la imagen debe ser mayor a 0 y maximo 5 MB");
    }
    this.tamanoBytes = tamanoBytes;
    this.orden = orden;
    this.esPortada = esPortada;
    this.fechaSubida = Objects.requireNonNull(fechaSubida, "La fecha de subida es obligatoria");
  }

  public void marcarComoPortada() {
    this.esPortada = true;
  }

  public void quitarPortada() {
    this.esPortada = false;
  }

  public void actualizarOrden(int nuevoOrden) {
    this.orden = nuevoOrden;
  }

  public IdImagenCampana obtenerId() {
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
