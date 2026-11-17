package com.crowdfunding.contribution.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Acceso de Spring Data a la tabla {@code campanas_aportables}. */
public interface CampanaAportableJpaRepository
    extends JpaRepository<CampanaAportableJpaEntity, UUID> {}
