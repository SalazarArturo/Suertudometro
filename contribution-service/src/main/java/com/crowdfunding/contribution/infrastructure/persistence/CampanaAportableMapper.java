package com.crowdfunding.contribution.infrastructure.persistence;

import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import com.crowdfunding.contribution.domain.valueobject.IdOrganizador;

/** Convierte entre {@link CampanaAportable} y su fila de JPA. */
public final class CampanaAportableMapper {

  private CampanaAportableMapper() {}

  public static CampanaAportableJpaEntity aEntidad(CampanaAportable campana) {
    return new CampanaAportableJpaEntity(
        campana.idCampana().valor(),
        campana.idOrganizador().map(IdOrganizador::valor).orElse(null),
        campana.titulo(),
        campana.moneda(),
        campana.fechaLimite().orElse(null),
        campana.estado(),
        campana.actualizadoEn());
  }

  public static CampanaAportable aDominio(CampanaAportableJpaEntity entidad) {
    return CampanaAportable.reconstituir(
        new IdCampana(entidad.getIdCampana()),
        entidad.getIdOrganizador() == null ? null : new IdOrganizador(entidad.getIdOrganizador()),
        entidad.getTitulo(),
        entidad.getMoneda(),
        entidad.getFechaLimite(),
        entidad.getEstado(),
        entidad.getActualizadoEn());
  }
}
