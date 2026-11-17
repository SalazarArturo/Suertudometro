package com.crowdfunding.contribution.infrastructure.persistence;

import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.repository.CampanaAportableRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/** Implementa la proyección local de campañas con JPA. */
@Repository
public class CampanaAportableJpaAdapter implements CampanaAportableRepositorio {

  private final CampanaAportableJpaRepository campanas;

  public CampanaAportableJpaAdapter(CampanaAportableJpaRepository campanas) {
    this.campanas = campanas;
  }

  @Override
  public Optional<CampanaAportable> buscarPorId(IdCampana idCampana) {
    return campanas.findById(idCampana.valor()).map(CampanaAportableMapper::aDominio);
  }

  @Override
  public void guardar(CampanaAportable campana) {
    campanas.save(CampanaAportableMapper.aEntidad(campana));
  }
}
