package com.crowdfunding.campaign.application.dto;

import com.crowdfunding.campaign.domain.model.Campana;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record DetalleCampanaDto(
    UUID id,
    UUID idOrganizador,
    String titulo,
    String historia,
    String categoria,
    String metaFinanciera,
    String montoRecaudado,
    String moneda,
    Instant fechaLimite,
    String estado,
    String observacionesRechazo,
    String motivoCierre,
    Instant fechaCreacion,
    Instant fechaPublicacion,
    Instant fechaCierre,
    List<ImagenCampanaDto> imagenes) {

  public static DetalleCampanaDto desdeDominio(Campana campana) {
    List<ImagenCampanaDto> imagenesDto =
        campana.obtenerImagenes().stream().map(ImagenCampanaDto::desdeDominio).toList();

    return new DetalleCampanaDto(
        campana.obtenerId().valor(),
        campana.obtenerIdOrganizador().valor(),
        campana.obtenerTitulo().valor(),
        campana.obtenerHistoria().valor(),
        campana.obtenerCategoria().name(),
        campana.obtenerMetaFinanciera().dinero().comoTexto(),
        campana.obtenerMontoRecaudado().comoTexto(),
        campana.obtenerMontoRecaudado().moneda(),
        campana.obtenerPlazo().fechaLimite(),
        campana.obtenerEstado().name(),
        campana.obtenerObservacionesRechazo() != null
            ? campana.obtenerObservacionesRechazo().detalle()
            : null,
        campana.obtenerMotivoCierre() != null ? campana.obtenerMotivoCierre().name() : null,
        campana.obtenerFechaCreacion(),
        campana.obtenerFechaPublicacion(),
        campana.obtenerFechaCierre(),
        imagenesDto);
  }
}
