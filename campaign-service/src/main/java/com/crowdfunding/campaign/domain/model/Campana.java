package com.crowdfunding.campaign.domain.model;

import com.crowdfunding.campaign.domain.event.CampanaAprobada;
import com.crowdfunding.campaign.domain.event.CampanaCancelada;
import com.crowdfunding.campaign.domain.event.CampanaCreada;
import com.crowdfunding.campaign.domain.event.CampanaEditada;
import com.crowdfunding.campaign.domain.event.CampanaEliminada;
import com.crowdfunding.campaign.domain.event.CampanaEnviadaARevision;
import com.crowdfunding.campaign.domain.event.CampanaFinalizada;
import com.crowdfunding.campaign.domain.event.CampanaRechazada;
import com.crowdfunding.campaign.domain.event.MetaAlcanzada;
import com.crowdfunding.campaign.domain.event.PlazoVencido;
import com.crowdfunding.campaign.domain.rule.CampanaDebeEstarEnBorradorRegla;
import com.crowdfunding.campaign.domain.rule.CampanaDebeEstarEnRevisionParaModerarRegla;
import com.crowdfunding.campaign.domain.rule.CampanaDebeEstarPublicadaRegla;
import com.crowdfunding.campaign.domain.rule.CampanaDebeTenerPortadaParaRevisionRegla;
import com.crowdfunding.campaign.domain.rule.CampanaNoDebeEstarEnEstadoTerminalRegla;
import com.crowdfunding.campaign.domain.rule.LimiteImagenesPorCampanaRegla;
import com.crowdfunding.campaign.domain.rule.PlazoCampanaDebeSerFuturoRegla;
import com.crowdfunding.campaign.domain.rule.SoloOrganizadorDuenoPuedeModificarCampanaRegla;
import com.crowdfunding.campaign.domain.valueobject.HistoriaCampana;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.IdImagenCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.domain.valueobject.MetaFinanciera;
import com.crowdfunding.campaign.domain.valueobject.ObservacionModeracion;
import com.crowdfunding.campaign.domain.valueobject.PlazoCampana;
import com.crowdfunding.campaign.domain.valueobject.TituloCampana;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import com.crowdfunding.campaign.sharedkernel.RaizDeAgregado;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

public final class Campana extends RaizDeAgregado {

  private static final int LONGITUD_MAXIMA_RESUMEN = 200;

  private final IdCampana id;
  private final IdOrganizador idOrganizador;
  private TituloCampana titulo;
  private HistoriaCampana historia;
  private CategoriaCampana categoria;
  private MetaFinanciera metaFinanciera;
  private Dinero montoRecaudado;
  private PlazoCampana plazo;
  private EstadoCampana estado;
  private ObservacionModeracion observacionesRechazo;
  private MotivoCierre motivoCierre;
  private final Instant fechaCreacion;
  private Instant fechaPublicacion;
  private Instant fechaCierre;
  private final List<ImagenCampana> imagenes;
  private final List<EntradaHistorialEstado> historialEstados;

  /* el antes
  private Campana(
          IdCampana id,
          IdOrganizador idOrganizador,
          TituloCampana titulo,
          HistoriaCampana historia,
          CategoriaCampana categoria,
          MetaFinanciera metaFinanciera,
          Dinero montoRecaudado,
          PlazoCampana plazo,
          EstadoCampana estado,
          ObservacionModeracion observacionesRechazo,
          MotivoCierre motivoCierre,
          Instant fechaCreacion,
          Instant fechaPublicacion,
          Instant fechaCierre,
          List<ImagenCampana> imagenes,
          List<EntradaHistorialEstado> historialEstados) {
      this.id = Objects.requireNonNull(id, "El id de la campana es obligatorio");
      this.idOrganizador = Objects.requireNonNull(idOrganizador, "El id del organizador es obligatorio");
      this.titulo = Objects.requireNonNull(titulo, "El titulo es obligatorio");
      this.historia = Objects.requireNonNull(historia, "La historia es obligatoria");
      this.categoria = Objects.requireNonNull(categoria, "La categoria es obligatoria");
      this.metaFinanciera = Objects.requireNonNull(metaFinanciera, "La meta financiera es obligatoria");
      this.montoRecaudado = Objects.requireNonNull(montoRecaudado, "El monto recaudado es obligatorio");
      this.plazo = Objects.requireNonNull(plazo, "El plazo es obligatorio");
      this.estado = Objects.requireNonNull(estado, "El estado es obligatorio");
      this.observacionesRechazo = observacionesRechazo;
      this.motivoCierre = motivoCierre;
      this.fechaCreacion = Objects.requireNonNull(fechaCreacion, "La fecha de creacion es obligatoria");
      this.fechaPublicacion = fechaPublicacion;
      this.fechaCierre = fechaCierre;
      this.imagenes = new ArrayList<>(Objects.requireNonNull(imagenes, "La lista de imagenes es obligatoria"));
      this.historialEstados = new ArrayList<>(
              Objects.requireNonNull(historialEstados, "El historial de estados es obligatorio"));
  }

  //entonces este metodo sigue a su manera el patron factory ? si fuera asi diria que si porque solo crea campañas en estado borrador
  //el tema es que sigue usando ese constructor mounstruoso de la campaña como tal con 16 parametros
  public static Campana crearBorrador(
          IdOrganizador idOrganizador,
          TituloCampana titulo,
          HistoriaCampana historia,
          CategoriaCampana categoria,
          MetaFinanciera metaFinanciera,
          PlazoCampana plazo,
          Instant momentoActual) {
      verificarRegla(new PlazoCampanaDebeSerFuturoRegla(plazo, momentoActual));

      IdCampana nuevoId = IdCampana.nuevo();
      EntradaHistorialEstado entradaInicial = EntradaHistorialEstado.registrar(
              null,
              EstadoCampana.BORRADOR,
              idOrganizador.valor(),
              "Creacion inicial del borrador de campana",
              momentoActual);

      Campana campana = new Campana(
              nuevoId,
              idOrganizador,
              titulo,
              historia,
              categoria,
              metaFinanciera,
              Dinero.ceroBob(),
              plazo,
              EstadoCampana.BORRADOR,
              null,
              null,
              momentoActual,
              null,
              null,
              new ArrayList<>(),
              List.of(entradaInicial));

      campana.registrarEvento(new CampanaCreada(
              nuevoId.valor(),
              idOrganizador.valor(),
              titulo.valor(),
              categoria,
              metaFinanciera.dinero(),
              plazo.fechaLimite()));

      return campana;
  }

  public static Campana reconstruir(
          IdCampana id,
          IdOrganizador idOrganizador,
          TituloCampana titulo,
          HistoriaCampana historia,
          CategoriaCampana categoria,
          MetaFinanciera metaFinanciera,
          Dinero montoRecaudado,
          PlazoCampana plazo,
          EstadoCampana estado,
          ObservacionModeracion observacionesRechazo,
          MotivoCierre motivoCierre,
          Instant fechaCreacion,
          Instant fechaPublicacion,
          Instant fechaCierre,
          List<ImagenCampana> imagenes,
          List<EntradaHistorialEstado> historialEstados) {
      return new Campana(
              id,
              idOrganizador,
              titulo,
              historia,
              categoria,
              metaFinanciera,
              montoRecaudado,
              plazo,
              estado,
              observacionesRechazo,
              motivoCierre,
              fechaCreacion,
              fechaPublicacion,
              fechaCierre,
              imagenes,
              historialEstados);
  }*/
  // el despois paaaai
  Campana(CampanaBuilder builder) {

    Objects.requireNonNull(builder, "El builder de campana es obligatorio");
    this.id = Objects.requireNonNull(builder.id, "El id de la campana es obligatorio");
    this.idOrganizador =
        Objects.requireNonNull(builder.idOrganizador, "El id del organizador es obligatorio");
    this.titulo = Objects.requireNonNull(builder.titulo, "El titulo es obligatorio");
    this.historia = Objects.requireNonNull(builder.historia, "La historia es obligatoria");
    this.categoria = Objects.requireNonNull(builder.categoria, "La categoria es obligatoria");
    this.metaFinanciera =
        Objects.requireNonNull(builder.metaFinanciera, "La meta financiera es obligatoria");
    this.montoRecaudado =
        Objects.requireNonNull(builder.montoRecaudado, "El monto recaudado es obligatorio");
    this.plazo = Objects.requireNonNull(builder.plazo, "El plazo es obligatorio");
    this.estado = Objects.requireNonNull(builder.estado, "El estado es obligatorio");
    this.observacionesRechazo = builder.observacionesRechazo;
    this.motivoCierre = builder.motivoCierre;
    this.fechaCreacion =
        Objects.requireNonNull(builder.fechaCreacion, "La fecha de creacion es obligatoria");
    this.fechaPublicacion = builder.fechaPublicacion;
    this.fechaCierre = builder.fechaCierre;
    this.imagenes =
        new ArrayList<>(
            Objects.requireNonNull(builder.imagenes, "La lista de imagenes es obligatoria"));
    this.historialEstados =
        new ArrayList<>(
            Objects.requireNonNull(
                builder.historialEstados, "El historial de estados es obligatorio"));
  }

  public static Campana crearBorrador(
      IdOrganizador idOrganizador,
      TituloCampana titulo,
      HistoriaCampana historia,
      CategoriaCampana categoria,
      MetaFinanciera metaFinanciera,
      PlazoCampana plazo,
      Instant momentoActual) {

    verificarRegla(new PlazoCampanaDebeSerFuturoRegla(plazo, momentoActual));

    IdCampana nuevoId = IdCampana.nuevo();
    EntradaHistorialEstado entradaInicial =
        EntradaHistorialEstado.registrar(
            null,
            EstadoCampana.BORRADOR,
            idOrganizador.valor(),
            "Creacion inicial del borrador de campana",
            momentoActual);

    Campana campana =
        new CampanaBuilder()
            .conId(nuevoId)
            .conIdOrganizador(idOrganizador)
            .conTitulo(titulo)
            .conHistoria(historia)
            .conCategoria(categoria)
            .conMetaFinanciera(metaFinanciera)
            .conPlazo(plazo)
            .conFechaCreacion(momentoActual)
            .conHistorialEstados(List.of(entradaInicial))
            .construir();

    campana.registrarEvento(
        new CampanaCreada(
            nuevoId.valor(),
            idOrganizador.valor(),
            titulo.valor(),
            categoria,
            metaFinanciera.dinero(),
            plazo.fechaLimite()));

    return campana;
  }

  public static CampanaBuilder reconstruir() {
    return new CampanaBuilder();
  }

  public void editarBorrador(
      IdOrganizador idSolicitante,
      TituloCampana nuevoTitulo,
      HistoriaCampana nuevaHistoria,
      CategoriaCampana nuevaCategoria,
      MetaFinanciera nuevaMeta,
      PlazoCampana nuevoPlazo,
      Instant momentoActual) {

    verificarRegla(
        new SoloOrganizadorDuenoPuedeModificarCampanaRegla(this.idOrganizador, idSolicitante));
    verificarRegla(new CampanaDebeEstarEnBorradorRegla(this.estado, "editar los datos"));
    verificarRegla(new PlazoCampanaDebeSerFuturoRegla(nuevoPlazo, momentoActual));

    this.titulo = Objects.requireNonNull(nuevoTitulo, "El nuevo titulo es obligatorio");
    this.historia = Objects.requireNonNull(nuevaHistoria, "La nueva historia es obligatoria");
    this.categoria = Objects.requireNonNull(nuevaCategoria, "La nueva categoria es obligatoria");
    this.metaFinanciera =
        Objects.requireNonNull(nuevaMeta, "La nueva meta financiera es obligatoria");
    this.plazo = Objects.requireNonNull(nuevoPlazo, "El nuevo plazo es obligatorio");

    registrarEvento(
        new CampanaEditada(
            this.id.valor(),
            this.titulo.valor(),
            this.categoria,
            this.metaFinanciera.dinero(),
            this.plazo.fechaLimite()));
  }

  public ImagenCampana agregarImagen(
      IdOrganizador idSolicitante,
      IdImagenCampana idImagen,
      String urlPublica,
      String nombreOriginal,
      String tipoMime,
      long tamanoBytes,
      boolean esPortada,
      Instant momentoActual) {
    verificarRegla(
        new SoloOrganizadorDuenoPuedeModificarCampanaRegla(this.idOrganizador, idSolicitante));
    verificarRegla(new CampanaDebeEstarEnBorradorRegla(this.estado, "agregar imagenes"));
    verificarRegla(new LimiteImagenesPorCampanaRegla(this.imagenes.size() + 1));

    boolean marcarPortada = esPortada || this.imagenes.isEmpty();
    if (marcarPortada) {
      this.imagenes.forEach(ImagenCampana::quitarPortada);
    }

    int siguienteOrden = this.imagenes.size() + 1;
    ImagenCampana nuevaImagen =
        new ImagenCampana(
            idImagen,
            urlPublica,
            nombreOriginal,
            tipoMime,
            tamanoBytes,
            siguienteOrden,
            marcarPortada,
            momentoActual);

    this.imagenes.add(nuevaImagen);
    return nuevaImagen;
  }

  public void marcarImagenComoPortada(IdOrganizador idSolicitante, IdImagenCampana idImagen) {
    verificarRegla(
        new SoloOrganizadorDuenoPuedeModificarCampanaRegla(this.idOrganizador, idSolicitante));
    verificarRegla(
        new CampanaDebeEstarEnBorradorRegla(this.estado, "cambiar la imagen de portada"));

    ImagenCampana objetivo =
        this.imagenes.stream()
            .filter(img -> img.obtenerId().equals(idImagen))
            .findFirst()
            .orElseThrow(
                () ->
                    new IllegalArgumentException("La imagen indicada no pertenece a esta campana"));

    this.imagenes.forEach(ImagenCampana::quitarPortada);
    objetivo.marcarComoPortada();
  }

  public void eliminarImagen(IdOrganizador idSolicitante, IdImagenCampana idImagen) {
    verificarRegla(
        new SoloOrganizadorDuenoPuedeModificarCampanaRegla(this.idOrganizador, idSolicitante));
    verificarRegla(new CampanaDebeEstarEnBorradorRegla(this.estado, "eliminar imagenes"));

    ImagenCampana aEliminar =
        this.imagenes.stream()
            .filter(img -> img.obtenerId().equals(idImagen))
            .findFirst()
            .orElseThrow(
                () ->
                    new IllegalArgumentException("La imagen indicada no pertenece a esta campana"));

    boolean eraPortada = aEliminar.esPortada();
    this.imagenes.remove(aEliminar);

    for (int i = 0; i < this.imagenes.size(); i++) {
      this.imagenes.get(i).actualizarOrden(i + 1);
    }

    if (eraPortada && !this.imagenes.isEmpty()) {
      this.imagenes.get(0).marcarComoPortada();
    }
  }

  public void validarEliminacionBorrador(IdOrganizador idSolicitante) {
    verificarRegla(
        new SoloOrganizadorDuenoPuedeModificarCampanaRegla(this.idOrganizador, idSolicitante));
    verificarRegla(new CampanaDebeEstarEnBorradorRegla(this.estado, "eliminar la campana"));

    registrarEvento(new CampanaEliminada(this.id.valor(), this.idOrganizador.valor()));
  }

  public void solicitarRevision(IdOrganizador idSolicitante, Instant momentoActual) {
    verificarRegla(
        new SoloOrganizadorDuenoPuedeModificarCampanaRegla(this.idOrganizador, idSolicitante));
    verificarRegla(new CampanaDebeEstarEnBorradorRegla(this.estado, "enviar a revision"));
    verificarRegla(new PlazoCampanaDebeSerFuturoRegla(this.plazo, momentoActual));
    verificarRegla(new CampanaDebeTenerPortadaParaRevisionRegla(tieneImagenDePortada()));

    EstadoCampana anterior = this.estado;
    this.estado = EstadoCampana.EN_REVISION;
    this.observacionesRechazo = null;

    this.historialEstados.add(
        EntradaHistorialEstado.registrar(
            anterior,
            EstadoCampana.EN_REVISION,
            idSolicitante.valor(),
            "Campana enviada a revision por el organizador",
            momentoActual));

    registrarEvento(new CampanaEnviadaARevision(this.id.valor(), this.idOrganizador.valor()));
  }

  public void aprobar(UUID idAdministrador, Instant momentoActual) {
    Objects.requireNonNull(idAdministrador, "El id del administrador es obligatorio");
    verificarRegla(new CampanaDebeEstarEnRevisionParaModerarRegla(this.estado));

    EstadoCampana anterior = this.estado;
    this.estado = EstadoCampana.PUBLICADA;
    this.observacionesRechazo = null;
    this.fechaPublicacion =
        Objects.requireNonNull(momentoActual, "La fecha de publicacion es obligatoria");

    this.historialEstados.add(
        EntradaHistorialEstado.registrar(
            anterior,
            EstadoCampana.PUBLICADA,
            idAdministrador,
            "Campana aprobada y publicada por administracion",
            momentoActual));

    registrarEvento(
        new CampanaAprobada(
            this.id.valor(),
            this.idOrganizador.valor(),
            this.titulo.valor(),
            this.historia.valor(),
            this.categoria,
            this.metaFinanciera.dinero(),
            obtenerUrlPortadaObligatoria(),
            this.fechaPublicacion,
            this.plazo.fechaLimite()));
  }

  public void rechazar(
      UUID idAdministrador, ObservacionModeracion observaciones, Instant momentoActual) {
    Objects.requireNonNull(idAdministrador, "El id del administrador es obligatorio");
    Objects.requireNonNull(observaciones, "Las observaciones de rechazo son obligatorias");
    verificarRegla(new CampanaDebeEstarEnRevisionParaModerarRegla(this.estado));

    EstadoCampana anterior = this.estado;
    this.estado = EstadoCampana.BORRADOR;
    this.observacionesRechazo = observaciones;

    this.historialEstados.add(
        EntradaHistorialEstado.registrar(
            anterior,
            EstadoCampana.BORRADOR,
            idAdministrador,
            "Campana observada en revision: " + observaciones.detalle(),
            momentoActual));

    registrarEvento(
        new CampanaRechazada(
            this.id.valor(),
            this.idOrganizador.valor(),
            this.titulo.valor(),
            observaciones.detalle(),
            momentoActual));
  }

  public void registrarAporte(Dinero montoAporte, Instant momentoActual) {
    Objects.requireNonNull(montoAporte, "El monto del aporte es obligatorio");
    if (!montoAporte.esMayorQueCero()) {
      throw new IllegalArgumentException("El monto del aporte debe ser mayor a cero");
    }

    this.montoRecaudado = this.montoRecaudado.sumar(montoAporte);

    if (this.estado == EstadoCampana.PUBLICADA
        && this.metaFinanciera.fueAlcanzadaPor(this.montoRecaudado)) {
      EstadoCampana anterior = this.estado;
      this.estado = EstadoCampana.FINALIZADA;
      this.motivoCierre = MotivoCierre.META_ALCANZADA;
      this.fechaCierre = Objects.requireNonNull(momentoActual, "El momento actual es obligatorio");

      this.historialEstados.add(
          EntradaHistorialEstado.registrar(
              anterior,
              EstadoCampana.FINALIZADA,
              null,
              "Cierre automatico por alcanzar la meta financiera",
              momentoActual));

      registrarEvento(
          new MetaAlcanzada(
              this.id.valor(),
              this.idOrganizador.valor(),
              this.titulo.valor(),
              this.metaFinanciera.dinero(),
              this.montoRecaudado,
              momentoActual));

      registrarEvento(
          new CampanaFinalizada(
              this.id.valor(), MotivoCierre.META_ALCANZADA, this.montoRecaudado, momentoActual));
    }
  }

  public void cerrarPorPlazoVencido(Instant momentoActual) {
    verificarRegla(new CampanaDebeEstarPublicadaRegla(this.estado, "cerrar por plazo vencido"));
    if (!this.plazo.estaVencidoEn(momentoActual)) {
      throw new IllegalArgumentException("El plazo de la campana aun no ha vencido");
    }

    EstadoCampana anterior = this.estado;
    this.estado = EstadoCampana.FINALIZADA;
    this.motivoCierre = MotivoCierre.PLAZO_VENCIDO;
    this.fechaCierre = momentoActual;

    this.historialEstados.add(
        EntradaHistorialEstado.registrar(
            anterior,
            EstadoCampana.FINALIZADA,
            null,
            "Cierre automatico por vencimiento del plazo",
            momentoActual));

    registrarEvento(new PlazoVencido(this.id.valor(), momentoActual));
    registrarEvento(
        new CampanaFinalizada(
            this.id.valor(), MotivoCierre.PLAZO_VENCIDO, this.montoRecaudado, momentoActual));
  }

  public void cancelar(
      UUID idActor, boolean esAdministrador, String motivoCancelacion, Instant momentoActual) {
    Objects.requireNonNull(idActor, "El id del actor es obligatorio");
    if (motivoCancelacion == null || motivoCancelacion.trim().isEmpty()) {
      throw new IllegalArgumentException("El motivo de cancelacion es obligatorio");
    }
    if (!esAdministrador) {
      verificarRegla(
          new SoloOrganizadorDuenoPuedeModificarCampanaRegla(
              this.idOrganizador, IdOrganizador.de(idActor)));
    }
    verificarRegla(new CampanaNoDebeEstarEnEstadoTerminalRegla(this.estado));

    EstadoCampana anterior = this.estado;
    this.estado = EstadoCampana.CANCELADA;
    this.motivoCierre = MotivoCierre.CANCELACION;
    this.fechaCierre = Objects.requireNonNull(momentoActual, "La fecha de cierre es obligatoria");
    String motivoLimpio = motivoCancelacion.trim();

    this.historialEstados.add(
        EntradaHistorialEstado.registrar(
            anterior,
            EstadoCampana.CANCELADA,
            idActor,
            "Campana cancelada: " + motivoLimpio,
            momentoActual));

    registrarEvento(
        new CampanaCancelada(this.id.valor(), motivoLimpio, this.montoRecaudado, momentoActual));
  }

  public boolean tieneImagenDePortada() {
    return this.imagenes.stream().anyMatch(ImagenCampana::esPortada);
  }

  private String obtenerUrlPortadaObligatoria() {
    return this.imagenes.stream()
        .filter(ImagenCampana::esPortada)
        .map(ImagenCampana::obtenerUrlPublica)
        .findFirst()
        .orElseThrow(() -> new IllegalStateException("La campana no tiene imagen de portada"));
  }

  private String generarResumen() {
    String texto = this.historia.valor();
    if (texto.length() <= LONGITUD_MAXIMA_RESUMEN) {
      return texto;
    }
    return texto.substring(0, LONGITUD_MAXIMA_RESUMEN - 3).trim() + "...";
  }

  public IdCampana obtenerId() {
    return id;
  }

  public IdOrganizador obtenerIdOrganizador() {
    return idOrganizador;
  }

  public TituloCampana obtenerTitulo() {
    return titulo;
  }

  public HistoriaCampana obtenerHistoria() {
    return historia;
  }

  public CategoriaCampana obtenerCategoria() {
    return categoria;
  }

  public MetaFinanciera obtenerMetaFinanciera() {
    return metaFinanciera;
  }

  public Dinero obtenerMontoRecaudado() {
    return montoRecaudado;
  }

  public PlazoCampana obtenerPlazo() {
    return plazo;
  }

  public EstadoCampana obtenerEstado() {
    return estado;
  }

  public ObservacionModeracion obtenerObservacionesRechazo() {
    return observacionesRechazo;
  }

  public MotivoCierre obtenerMotivoCierre() {
    return motivoCierre;
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

  public List<ImagenCampana> obtenerImagenes() {
    return Collections.unmodifiableList(imagenes);
  }

  public List<EntradaHistorialEstado> obtenerHistorialEstados() {
    return Collections.unmodifiableList(historialEstados);
  }
}
