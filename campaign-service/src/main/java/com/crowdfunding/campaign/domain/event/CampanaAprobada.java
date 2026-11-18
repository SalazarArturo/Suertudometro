package com.crowdfunding.campaign.domain.event;

import com.crowdfunding.campaign.domain.model.CategoriaCampana;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.time.Instant;
import java.util.UUID;

public final class CampanaAprobada extends EventoDeDominio {

  private final UUID idCampana;
  private final UUID idOrganizador;
  private final String titulo;
  private final String resumen;
  private final CategoriaCampana categoria;
  private final Dinero metaFinanciera;
  private final String urlPortada;
  private final Instant fechaPublicacion;
  private final Instant fechaLimite;

  public CampanaAprobada(
      UUID idCampana,
      UUID idOrganizador,
      String titulo,
      String resumen,
      CategoriaCampana categoria,
      Dinero metaFinanciera,
      String urlPortada,
      Instant fechaPublicacion,
      Instant fechaLimite) {
    super();
    this.idCampana = idCampana;
    this.idOrganizador = idOrganizador;
    this.titulo = titulo;
    this.resumen = resumen;
    this.categoria = categoria;
    this.metaFinanciera = metaFinanciera;
    this.urlPortada = urlPortada;
    this.fechaPublicacion = fechaPublicacion;
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

  public String obtenerResumen() {
    return resumen;
  }

  public CategoriaCampana obtenerCategoria() {
    return categoria;
  }

  public Dinero obtenerMetaFinanciera() {
    return metaFinanciera;
  }

  public String obtenerUrlPortada() {
    return urlPortada;
  }

  public Instant obtenerFechaPublicacion() {
    return fechaPublicacion;
  }

  public Instant obtenerFechaLimite() {
    return fechaLimite;
  }
}
