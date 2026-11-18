package com.crowdfunding.campaign.domain.event;

import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.UUID;

public final class CampanaRechazada extends EventoDeDominio {

  private final UUID idCampana;
  private final UUID idOrganizador;
  private final String titulo;
  private final String observaciones;
  private final Instant fechaRechazo;

  public CampanaRechazada(
      UUID idCampana,
      UUID idOrganizador,
      String titulo,
      String observaciones,
      Instant fechaRechazo) {
    super();
    this.idCampana = idCampana;
    this.idOrganizador = idOrganizador;
    this.titulo = titulo;
    this.observaciones = observaciones;
    this.fechaRechazo = fechaRechazo;
  }

  public UUID obtenerIdCampana() {
    return idCampana;
  }

  public UUID obtenerIdOrganizador() {
    return idOrganizador;
  }

  public String obtenerTitulo() {
    return titulo;
  }

  public String obtenerObservaciones() {
    return observaciones;
  }

  public Instant obtenerFechaRechazo() {
    return fechaRechazo;
  }
}
