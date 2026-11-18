package com.crowdfunding.campaign.application.dto;

import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.model.ImagenCampana;
import java.time.Instant;
import java.util.UUID;

public record ResumenCampanaDto(
    UUID id,
    UUID idOrganizador,
    String titulo,
    String categoria,
    String metaFinanciera,
    String montoRecaudado,
    String moneda,
    Instant fechaLimite,
    String estado,
    String urlPortada,
    Instant fechaCreacion) {

  public static ResumenCampanaDto desdeDominio(Campana campana) {
    String portada =
        campana.obtenerImagenes().stream()
            .filter(ImagenCampana::esPortada)
            .map(ImagenCampana::obtenerUrlPublica)
            .findFirst()
            .orElse(null);

    return new ResumenCampanaDto(
        campana.obtenerId().valor(),
        campana.obtenerIdOrganizador().valor(),
        campana.obtenerTitulo().valor(),
        campana.obtenerCategoria().name(),
        campana.obtenerMetaFinanciera().dinero().comoTexto(),
        campana.obtenerMontoRecaudado().comoTexto(),
        campana.obtenerMontoRecaudado().moneda(),
        campana.obtenerPlazo().fechaLimite(),
        campana.obtenerEstado().name(),
        portada,
        campana.obtenerFechaCreacion());
  }
}
