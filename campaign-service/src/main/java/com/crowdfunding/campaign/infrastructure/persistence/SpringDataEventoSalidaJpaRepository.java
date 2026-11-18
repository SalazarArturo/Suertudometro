package com.crowdfunding.campaign.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SpringDataEventoSalidaJpaRepository
    extends JpaRepository<EventoSalidaJpaEntity, UUID> {

  List<EventoSalidaJpaEntity> findTop50ByPublicadoEnIsNullOrderByOcurridoEnAsc();
}
