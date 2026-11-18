package com.crowdfunding.campaign.domain.model;

import com.crowdfunding.campaign.domain.valueobject.HistoriaCampana;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.domain.valueobject.MetaFinanciera;
import com.crowdfunding.campaign.domain.valueobject.ObservacionModeracion;
import com.crowdfunding.campaign.domain.valueobject.PlazoCampana;
import com.crowdfunding.campaign.domain.valueobject.TituloCampana;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

public final class CampanaBuilder {

  IdCampana id;
  IdOrganizador idOrganizador;
  TituloCampana titulo;
  HistoriaCampana historia;
  CategoriaCampana categoria;
  MetaFinanciera metaFinanciera;
  Dinero montoRecaudado = Dinero.ceroBob();
  PlazoCampana plazo;
  EstadoCampana estado = EstadoCampana.BORRADOR;
  ObservacionModeracion observacionesRechazo;
  MotivoCierre motivoCierre;
  Instant fechaCreacion;
  Instant fechaPublicacion;
  Instant fechaCierre;
  List<ImagenCampana> imagenes = new ArrayList<>();
  List<EntradaHistorialEstado> historialEstados = new ArrayList<>();

  public CampanaBuilder conId(IdCampana id) {
    this.id = id;
    return this;
  }

  public CampanaBuilder conIdOrganizador(IdOrganizador idOrganizador) {
    this.idOrganizador = idOrganizador;
    return this;
  }

  public CampanaBuilder conTitulo(TituloCampana titulo) {
    this.titulo = titulo;
    return this;
  }

  public CampanaBuilder conHistoria(HistoriaCampana historia) {
    this.historia = historia;
    return this;
  }

  public CampanaBuilder conCategoria(CategoriaCampana categoria) {
    this.categoria = categoria;
    return this;
  }

  public CampanaBuilder conMetaFinanciera(MetaFinanciera metaFinanciera) {
    this.metaFinanciera = metaFinanciera;
    return this;
  }

  public CampanaBuilder conMontoRecaudado(Dinero montoRecaudado) {
    this.montoRecaudado = montoRecaudado;
    return this;
  }

  public CampanaBuilder conPlazo(PlazoCampana plazo) {
    this.plazo = plazo;
    return this;
  }

  public CampanaBuilder conEstado(EstadoCampana estado) {
    this.estado = estado;
    return this;
  }

  public CampanaBuilder conObservacionesRechazo(ObservacionModeracion observacionesRechazo) {
    this.observacionesRechazo = observacionesRechazo;
    return this;
  }

  public CampanaBuilder conMotivoCierre(MotivoCierre motivoCierre) {
    this.motivoCierre = motivoCierre;
    return this;
  }

  public CampanaBuilder conFechaCreacion(Instant fechaCreacion) {
    this.fechaCreacion = fechaCreacion;
    return this;
  }

  public CampanaBuilder conFechaPublicacion(Instant fechaPublicacion) {
    this.fechaPublicacion = fechaPublicacion;
    return this;
  }

  public CampanaBuilder conFechaCierre(Instant fechaCierre) {
    this.fechaCierre = fechaCierre;
    return this;
  }

  public CampanaBuilder conImagenes(List<ImagenCampana> imagenes) {
    this.imagenes = imagenes;
    return this;
  }

  public CampanaBuilder conHistorialEstados(List<EntradaHistorialEstado> historialEstados) {
    this.historialEstados = historialEstados;
    return this;
  }

  public Campana construir() {
    return new Campana(this);
  }
}
