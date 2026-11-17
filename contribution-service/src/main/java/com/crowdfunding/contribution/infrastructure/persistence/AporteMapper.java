package com.crowdfunding.contribution.infrastructure.persistence;

import com.crowdfunding.contribution.application.query.AporteVista;
import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.valueobject.IdAportante;
import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.MensajeApoyo;
import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.Dinero;

/** Convierte entre el agregado {@link Aporte} y su fila de JPA. */
public final class AporteMapper {

  private AporteMapper() {}

  public static AporteJpaEntity aEntidad(Aporte aporte) {
    return new AporteJpaEntity(
        aporte.id().valor(),
        aporte.idCampana().valor(),
        aporte.idAportante().valor(),
        aporte.nombreAportante().map(NombreAportante::valor).orElse(null),
        aporte.esAnonimo(),
        aporte.monto().monto(),
        aporte.monto().moneda(),
        aporte.mensajeApoyo().map(MensajeApoyo::texto).orElse(null),
        aporte.registradoEn());
  }

  public static Aporte aDominio(AporteJpaEntity entidad) {
    return Aporte.reconstituir(
        new IdAporte(entidad.getId()),
        new IdCampana(entidad.getIdCampana()),
        new IdAportante(entidad.getIdAportante()),
        entidad.getNombreAportante() == null
            ? null
            : new NombreAportante(entidad.getNombreAportante()),
        entidad.esAnonimo(),
        new Dinero(entidad.getMonto(), entidad.getMoneda()),
        entidad.getMensajeApoyo() == null ? null : new MensajeApoyo(entidad.getMensajeApoyo()),
        entidad.getRegistradoEn());
  }

  /** El modelo de lectura de las consultas: la fila del aporte más el título de su campaña. */
  public static AporteVista aVista(AporteJpaEntity entidad, String tituloCampana) {
    return new AporteVista(
        entidad.getId(),
        entidad.getIdCampana(),
        tituloCampana,
        entidad.getIdAportante(),
        entidad.getNombreAportante(),
        entidad.esAnonimo(),
        new Dinero(entidad.getMonto(), entidad.getMoneda()),
        entidad.getMensajeApoyo(),
        entidad.getRegistradoEn());
  }
}
