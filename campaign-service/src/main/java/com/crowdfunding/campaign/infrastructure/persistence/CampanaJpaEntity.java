package com.crowdfunding.campaign.infrastructure.persistence;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "campanas")
public class CampanaJpaEntity {

  @Id
  @Column(name = "id", nullable = false, updatable = false)
  private UUID id;

  @Column(name = "id_organizador", nullable = false, updatable = false)
  private UUID idOrganizador;

  @Column(name = "titulo", nullable = false, length = 120)
  private String titulo;

  @Column(name = "historia", nullable = false, columnDefinition = "TEXT")
  private String historia;

  @Column(name = "categoria", nullable = false, length = 30)
  private String categoria;

  @Column(name = "meta_financiera", nullable = false, precision = 12, scale = 2)
  private BigDecimal metaFinanciera;

  @Column(name = "monto_recaudado", nullable = false, precision = 12, scale = 2)
  private BigDecimal montoRecaudado;

  @Column(name = "moneda", nullable = false, length = 3)
  private String moneda;

  @Column(name = "estado", nullable = false, length = 20)
  private String estado;

  @Column(name = "motivo_cierre", length = 20)
  private String motivoCierre;

  @Column(name = "observaciones_rechazo", columnDefinition = "TEXT")
  private String observacionesRechazo;

  @Column(name = "fecha_limite", nullable = false)
  private Instant fechaLimite;

  @Column(name = "fecha_creacion", nullable = false, updatable = false)
  private Instant fechaCreacion;

  @Column(name = "fecha_publicacion")
  private Instant fechaPublicacion;

  @Column(name = "fecha_cierre")
  private Instant fechaCierre;

  @Version
  @Column(name = "version", nullable = false)
  private long version;

  @OneToMany(
      mappedBy = "campana",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.EAGER)
  @OrderBy("orden ASC")
  private List<ImagenCampanaJpaEntity> imagenes = new ArrayList<>();

  @OneToMany(
      mappedBy = "campana",
      cascade = CascadeType.ALL,
      orphanRemoval = true,
      fetch = FetchType.EAGER)
  @OrderBy("fechaTransicion ASC")
  private List<HistorialEstadoJpaEntity> historialEstados = new ArrayList<>();

  protected CampanaJpaEntity() {}

  public CampanaJpaEntity(
      UUID id,
      UUID idOrganizador,
      String titulo,
      String historia,
      String categoria,
      BigDecimal metaFinanciera,
      BigDecimal montoRecaudado,
      String moneda,
      String estado,
      String motivoCierre,
      String observacionesRechazo,
      Instant fechaLimite,
      Instant fechaCreacion,
      Instant fechaPublicacion,
      Instant fechaCierre) {
    this.id = id;
    this.idOrganizador = idOrganizador;
    this.titulo = titulo;
    this.historia = historia;
    this.categoria = categoria;
    this.metaFinanciera = metaFinanciera;
    this.montoRecaudado = montoRecaudado;
    this.moneda = moneda;
    this.estado = estado;
    this.motivoCierre = motivoCierre;
    this.observacionesRechazo = observacionesRechazo;
    this.fechaLimite = fechaLimite;
    this.fechaCreacion = fechaCreacion;
    this.fechaPublicacion = fechaPublicacion;
    this.fechaCierre = fechaCierre;
  }

  public void actualizarDatos(
      String titulo,
      String historia,
      String categoria,
      BigDecimal metaFinanciera,
      BigDecimal montoRecaudado,
      String moneda,
      String estado,
      String motivoCierre,
      String observacionesRechazo,
      Instant fechaLimite,
      Instant fechaPublicacion,
      Instant fechaCierre) {
    this.titulo = titulo;
    this.historia = historia;
    this.categoria = categoria;
    this.metaFinanciera = metaFinanciera;
    this.montoRecaudado = montoRecaudado;
    this.moneda = moneda;
    this.estado = estado;
    this.motivoCierre = motivoCierre;
    this.observacionesRechazo = observacionesRechazo;
    this.fechaLimite = fechaLimite;
    this.fechaPublicacion = fechaPublicacion;
    this.fechaCierre = fechaCierre;
  }

  public void reemplazarImagenes(List<ImagenCampanaJpaEntity> nuevasImagenes) {
    this.imagenes.clear();
    for (ImagenCampanaJpaEntity img : nuevasImagenes) {
      img.asignarCampana(this);
      this.imagenes.add(img);
    }
  }

  public void reemplazarHistorial(List<HistorialEstadoJpaEntity> nuevoHistorial) {
    this.historialEstados.clear();
    for (HistorialEstadoJpaEntity h : nuevoHistorial) {
      h.asignarCampana(this);
      this.historialEstados.add(h);
    }
  }

  public UUID obtenerId() {
    return id;
  }

  public UUID obtenerIdOrganizador() {
    return idOrganizador;
  }

  public String obtenerTitulo() {
    return titulo;
  }

  public String obtenerHistoria() {
    return historia;
  }

  public String obtenerCategoria() {
    return categoria;
  }

  public BigDecimal obtenerMetaFinanciera() {
    return metaFinanciera;
  }

  public BigDecimal obtenerMontoRecaudado() {
    return montoRecaudado;
  }

  public String obtenerMoneda() {
    return moneda;
  }

  public String obtenerEstado() {
    return estado;
  }

  public String obtenerMotivoCierre() {
    return motivoCierre;
  }

  public String obtenerObservacionesRechazo() {
    return observacionesRechazo;
  }

  public Instant obtenerFechaLimite() {
    return fechaLimite;
  }

  public Instant obtenerFechaCreacion() {
    return fechaCreacion;
  }

  public Instant obtenerFechaPublicacion() {
    return fechaPublicacion;
  }

  public Instant obtenerFechaCierre() {
    return fechaCierre;
  }

  public List<ImagenCampanaJpaEntity> obtenerImagenes() {
    return imagenes;
  }

  public List<HistorialEstadoJpaEntity> obtenerHistorialEstados() {
    return historialEstados;
  }
}
