package com.crowdfunding.contribution.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

/**
 * Acceso de Spring Data a la tabla {@code aportes}. Solo lo usan los adaptadores de este paquete.
 */
public interface AporteJpaRepository extends JpaRepository<AporteJpaEntity, UUID> {

  /** Aportes de una campaña, del más reciente al más antiguo. */
  Page<AporteJpaEntity> findByIdCampanaOrderByRegistradoEnDescIdDesc(
      UUID idCampana, Pageable pagina);

  /** Aportes de un usuario, del más reciente al más antiguo. */
  Page<AporteJpaEntity> findByIdAportanteOrderByRegistradoEnDescIdDesc(
      UUID idAportante, Pageable pagina);
}
