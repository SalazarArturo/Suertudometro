package com.crowdfunding.campaign.infrastructure.persistence;

import com.crowdfunding.campaign.domain.model.Campana;
import com.crowdfunding.campaign.domain.model.CategoriaCampana;
import com.crowdfunding.campaign.domain.model.EntradaHistorialEstado;
import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.domain.model.ImagenCampana;
import com.crowdfunding.campaign.domain.model.MotivoCierre;
import com.crowdfunding.campaign.domain.valueobject.HistoriaCampana;
import com.crowdfunding.campaign.domain.valueobject.IdCampana;
import com.crowdfunding.campaign.domain.valueobject.IdImagenCampana;
import com.crowdfunding.campaign.domain.valueobject.IdOrganizador;
import com.crowdfunding.campaign.domain.valueobject.MetaFinanciera;
import com.crowdfunding.campaign.domain.valueobject.ObservacionModeracion;
import com.crowdfunding.campaign.domain.valueobject.PlazoCampana;
import com.crowdfunding.campaign.domain.valueobject.TituloCampana;
import com.crowdfunding.campaign.sharedkernel.Dinero;
import java.util.List;

public final class CampanaMapper {

  private CampanaMapper() {}

  public static Campana aDominio(CampanaJpaEntity entidad) {
    String moneda = entidad.obtenerMoneda();
    Dinero dineroMeta = new Dinero(entidad.obtenerMetaFinanciera(), moneda);
    Dinero dineroRecaudado = new Dinero(entidad.obtenerMontoRecaudado(), moneda);

    List<ImagenCampana> imagenes =
        entidad.obtenerImagenes().stream().map(CampanaMapper::imagenADominio).toList();

    List<EntradaHistorialEstado> historial =
        entidad.obtenerHistorialEstados().stream().map(CampanaMapper::historialADominio).toList();

    return Campana.reconstruir()
        .conId(IdCampana.de(entidad.obtenerId()))
        .conIdOrganizador(IdOrganizador.de(entidad.obtenerIdOrganizador()))
        .conTitulo(new TituloCampana(entidad.obtenerTitulo()))
        .conHistoria(new HistoriaCampana(entidad.obtenerHistoria()))
        .conCategoria(CategoriaCampana.valueOf(entidad.obtenerCategoria()))
        .conMetaFinanciera(MetaFinanciera.de(dineroMeta))
        .conMontoRecaudado(dineroRecaudado)
        .conPlazo(new PlazoCampana(entidad.obtenerFechaLimite()))
        .conEstado(EstadoCampana.valueOf(entidad.obtenerEstado()))
        .conObservacionesRechazo(
            entidad.obtenerObservacionesRechazo() != null
                ? new ObservacionModeracion(entidad.obtenerObservacionesRechazo())
                : null)
        .conMotivoCierre(
            entidad.obtenerMotivoCierre() != null
                ? MotivoCierre.valueOf(entidad.obtenerMotivoCierre())
                : null)
        .conFechaCreacion(entidad.obtenerFechaCreacion())
        .conFechaPublicacion(entidad.obtenerFechaPublicacion())
        .conFechaCierre(entidad.obtenerFechaCierre())
        .conImagenes(imagenes)
        .conHistorialEstados(historial)
        .construir();
  }

  public static CampanaJpaEntity aNuevaEntidadJpa(Campana campana) {
    CampanaJpaEntity entidad =
        new CampanaJpaEntity(
            campana.obtenerId().valor(),
            campana.obtenerIdOrganizador().valor(),
            campana.obtenerTitulo().valor(),
            campana.obtenerHistoria().valor(),
            campana.obtenerCategoria().name(),
            campana.obtenerMetaFinanciera().dinero().monto(),
            campana.obtenerMontoRecaudado().monto(),
            campana.obtenerMontoRecaudado().moneda(),
            campana.obtenerEstado().name(),
            campana.obtenerMotivoCierre() != null ? campana.obtenerMotivoCierre().name() : null,
            campana.obtenerObservacionesRechazo() != null
                ? campana.obtenerObservacionesRechazo().detalle()
                : null,
            campana.obtenerPlazo().fechaLimite(),
            campana.obtenerFechaCreacion(),
            campana.obtenerFechaPublicacion(),
            campana.obtenerFechaCierre());

    entidad.reemplazarImagenes(mapearImagenesJpa(campana.obtenerImagenes()));
    entidad.reemplazarHistorial(mapearHistorialJpa(campana.obtenerHistorialEstados()));
    return entidad;
  }

  public static void actualizarEntidadExistente(CampanaJpaEntity destino, Campana campana) {
    destino.actualizarDatos(
        campana.obtenerTitulo().valor(),
        campana.obtenerHistoria().valor(),
        campana.obtenerCategoria().name(),
        campana.obtenerMetaFinanciera().dinero().monto(),
        campana.obtenerMontoRecaudado().monto(),
        campana.obtenerMontoRecaudado().moneda(),
        campana.obtenerEstado().name(),
        campana.obtenerMotivoCierre() != null ? campana.obtenerMotivoCierre().name() : null,
        campana.obtenerObservacionesRechazo() != null
            ? campana.obtenerObservacionesRechazo().detalle()
            : null,
        campana.obtenerPlazo().fechaLimite(),
        campana.obtenerFechaPublicacion(),
        campana.obtenerFechaCierre());

    destino.reemplazarImagenes(mapearImagenesJpa(campana.obtenerImagenes()));
    destino.reemplazarHistorial(mapearHistorialJpa(campana.obtenerHistorialEstados()));
  }

  private static ImagenCampana imagenADominio(ImagenCampanaJpaEntity entidad) {
    return new ImagenCampana(
        IdImagenCampana.de(entidad.obtenerId()),
        entidad.obtenerUrlPublica(),
        entidad.obtenerNombreOriginal(),
        entidad.obtenerTipoMime(),
        entidad.obtenerTamanoBytes(),
        entidad.obtenerOrden(),
        entidad.esPortada(),
        entidad.obtenerFechaSubida());
  }

  private static EntradaHistorialEstado historialADominio(HistorialEstadoJpaEntity entidad) {
    return new EntradaHistorialEstado(
        entidad.obtenerId(),
        entidad.obtenerEstadoAnterior() != null
            ? EstadoCampana.valueOf(entidad.obtenerEstadoAnterior())
            : null,
        EstadoCampana.valueOf(entidad.obtenerEstadoNuevo()),
        entidad.obtenerIdActor(),
        entidad.obtenerMotivo(),
        entidad.obtenerFechaTransicion());
  }

  private static List<ImagenCampanaJpaEntity> mapearImagenesJpa(List<ImagenCampana> imagenes) {
    return imagenes.stream()
        .map(
            img ->
                new ImagenCampanaJpaEntity(
                    img.obtenerId().valor(),
                    img.obtenerUrlPublica(),
                    img.obtenerNombreOriginal(),
                    img.obtenerTipoMime(),
                    img.obtenerTamanoBytes(),
                    img.obtenerOrden(),
                    img.esPortada(),
                    img.obtenerFechaSubida()))
        .toList();
  }

  private static List<HistorialEstadoJpaEntity> mapearHistorialJpa(
      List<EntradaHistorialEstado> historial) {
    return historial.stream()
        .map(
            h ->
                new HistorialEstadoJpaEntity(
                    h.obtenerId(),
                    h.obtenerEstadoAnterior() != null ? h.obtenerEstadoAnterior().name() : null,
                    h.obtenerEstadoNuevo().name(),
                    h.obtenerIdActor(),
                    h.obtenerMotivo(),
                    h.obtenerFechaTransicion()))
        .toList();
  }
}
