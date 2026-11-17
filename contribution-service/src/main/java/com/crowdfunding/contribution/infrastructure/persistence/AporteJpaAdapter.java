package com.crowdfunding.contribution.infrastructure.persistence;

import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.repository.AporteRepositorio;
import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import java.util.Optional;
import org.springframework.stereotype.Repository;

/** Implementa el repositorio del dominio con JPA. */
@Repository
public class AporteJpaAdapter implements AporteRepositorio {

  private final AporteJpaRepository aportes;

  public AporteJpaAdapter(AporteJpaRepository aportes) {
    this.aportes = aportes;
  }

  @Override
  public void guardar(Aporte aporte) {
    aportes.save(AporteMapper.aEntidad(aporte));
  }

  @Override
  public Optional<Aporte> buscarPorId(IdAporte id) {
    return aportes.findById(id.valor()).map(AporteMapper::aDominio);
  }
}
