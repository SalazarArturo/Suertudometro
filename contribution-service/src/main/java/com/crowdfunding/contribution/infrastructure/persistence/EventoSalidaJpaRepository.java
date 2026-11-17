package com.crowdfunding.contribution.infrastructure.persistence;

import java.util.List;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

/** Acceso de Spring Data a la tabla outbox {@code eventos_salida}. */
public interface EventoSalidaJpaRepository extends JpaRepository<EventoSalidaJpaEntity, UUID> {

  /** El siguiente lote de eventos pendientes de envío, en el orden en que ocurrieron. */
  List<EventoSalidaJpaEntity> findTop50ByPublicadoEnIsNullOrderByOcurridoEnAsc();
}
