package com.crowdfunding.campaign.application.dto;

import com.crowdfunding.campaign.domain.model.ImagenCampana;
import java.time.Instant;
import java.util.UUID;

public record ImagenCampanaDto(
    UUID id,
    String urlPublica,
    String nombreOriginal,
    String tipoMime,
    long tamanoBytes,
    int orden,
    boolean esPortada,
    Instant fechaSubida) {

  public static ImagenCampanaDto desdeDominio(ImagenCampana imagen) {
    return new ImagenCampanaDto(
        imagen.obtenerId().valor(),
        imagen.obtenerUrlPublica(),
        imagen.obtenerNombreOriginal(),
        imagen.obtenerTipoMime(),
        imagen.obtenerTamanoBytes(),
        imagen.obtenerOrden(),
        imagen.esPortada(),
        imagen.obtenerFechaSubida());
  }
}
