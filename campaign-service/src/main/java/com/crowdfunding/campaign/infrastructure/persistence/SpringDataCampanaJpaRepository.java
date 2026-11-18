package com.crowdfunding.campaign.infrastructure.persistence;

import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataCampanaJpaRepository extends JpaRepository<CampanaJpaEntity, UUID> {

  Page<CampanaJpaEntity> findByIdOrganizadorOrderByFechaCreacionDesc(
      UUID idOrganizador, Pageable pageable);

  Page<CampanaJpaEntity> findByEstadoOrderByFechaCreacionAsc(String estado, Pageable pageable);

  List<CampanaJpaEntity> findByEstadoAndFechaLimiteLessThanEqual(
      String estado, Instant momentoActual);
}
