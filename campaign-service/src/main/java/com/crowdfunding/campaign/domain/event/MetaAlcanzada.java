package com.crowdfunding.campaign.domain.event;

import com.crowdfunding.campaign.sharedkernel.Dinero;
import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.UUID;

public final class MetaAlcanzada extends EventoDeDominio {

  private final UUID idCampana;
  private final UUID idOrganizador;
  private final String titulo;
  private final Dinero metaFinanciera;
  private final Dinero montoRecaudado;
  private final Instant fechaMetaAlcanzada;

  public MetaAlcanzada(
      UUID idCampana,
      UUID idOrganizador,
      String titulo,
      Dinero metaFinanciera,
      Dinero montoRecaudado,
      Instant fechaMetaAlcanzada) {
    super();
    this.idCampana = idCampana;
    this.idOrganizador = idOrganizador;
    this.titulo = titulo;
    this.metaFinanciera = metaFinanciera;
    this.montoRecaudado = montoRecaudado;
    this.fechaMetaAlcanzada = fechaMetaAlcanzada;
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

  public Dinero obtenerMetaFinanciera() {
    return metaFinanciera;
  }

  public Dinero obtenerMontoRecaudado() {
    return montoRecaudado;
  }

  public Instant obtenerFechaMetaAlcanzada() {
    return fechaMetaAlcanzada;
  }
}
