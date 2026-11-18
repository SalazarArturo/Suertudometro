package com.crowdfunding.campaign.domain.event;

import com.crowdfunding.campaign.domain.model.CategoriaCampana;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.UUID;

public final class CampanaCreada extends EventoDeDominio {

  private final UUID idCampana;
  private final UUID idOrganizador;
  private final String titulo;
  private final CategoriaCampana categoria;
  private final Dinero metaFinanciera;
  private final Instant fechaLimite;

  public CampanaCreada(
      UUID idCampana,
      UUID idOrganizador,
      String titulo,
      CategoriaCampana categoria,
      Dinero metaFinanciera,
      Instant fechaLimite) {
    super();
    this.idCampana = idCampana;
    this.idOrganizador = idOrganizador;
    this.titulo = titulo;
    this.categoria = categoria;
    this.metaFinanciera = metaFinanciera;
    this.fechaLimite = fechaLimite;
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

  public CategoriaCampana obtenerCategoria() {
    return categoria;
  }

  public Dinero obtenerMetaFinanciera() {
    return metaFinanciera;
  }

  public Instant obtenerFechaLimite() {
    return fechaLimite;
  }
}
