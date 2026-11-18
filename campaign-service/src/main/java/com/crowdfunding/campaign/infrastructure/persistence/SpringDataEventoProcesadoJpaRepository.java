package com.crowdfunding.campaign.infrastructure.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataEventoProcesadoJpaRepository
    extends JpaRepository<EventoProcesadoJpaEntity, UUID> {}
