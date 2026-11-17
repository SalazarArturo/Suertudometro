package com.crowdfunding.contribution.infrastructure.persistence;

import java.time.Instant;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** Acceso de Spring Data a la tabla {@code eventos_procesados}. */
public interface EventoProcesadoJpaRepository
    extends JpaRepository<EventoProcesadoJpaEntity, UUID> {

  /**
   * Inserta el evento solo si no estaba. Lo decide la base de datos con la clave primaria, así que
   * no hay carrera entre "consultar" e "insertar" si el mismo mensaje llega dos veces a la vez.
   *
   * @return 1 si el evento es nuevo; 0 si ya estaba
   */
  @Modifying
  @Query(
      value =
          """
          INSERT INTO eventos_procesados (id_evento, tipo_evento, procesado_en)
          VALUES (:idEvento, :tipoEvento, :procesadoEn)
          ON CONFLICT (id_evento) DO NOTHING
          """,
      nativeQuery = true)
  int insertarSiNoExiste(
      @Param("idEvento") UUID idEvento,
      @Param("tipoEvento") String tipoEvento,
      @Param("procesadoEn") Instant procesadoEn);
}
