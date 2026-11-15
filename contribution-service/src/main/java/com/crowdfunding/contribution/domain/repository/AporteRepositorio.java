package com.crowdfunding.contribution.domain.repository;

import com.crowdfunding.contribution.domain.model.Aporte;
import com.crowdfunding.contribution.domain.valueobject.IdAporte;
import java.util.Optional;

/**
 * Colección de aportes. La implementa infrastructure con JPA. No tiene operaciones para modificar
 * ni para eliminar, porque un aporte registrado no cambia (R7).
 */
public interface AporteRepositorio {

  void guardar(Aporte aporte);

  Optional<Aporte> buscarPorId(IdAporte id);
}
