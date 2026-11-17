package com.crowdfunding.contribution.domain.repository;

import com.crowdfunding.contribution.domain.model.CampanaAportable;
import com.crowdfunding.contribution.domain.valueobject.IdCampana;
import java.util.Optional;

/** Proyección local de las campañas publicadas. La implementa infrastructure con JPA. */
public interface CampanaAportableRepositorio {

  Optional<CampanaAportable> buscarPorId(IdCampana idCampana);

  /** Crea la campaña o guarda sus cambios. */
  void guardar(CampanaAportable campana);
}
