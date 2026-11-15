package com.crowdfunding.contribution.infrastructure.messaging;

import com.crowdfunding.contribution.application.port.PublicadorEventosPuerto;
import com.crowdfunding.contribution.domain.event.AporteRealizado;
import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaEntity;
import com.crowdfunding.contribution.infrastructure.persistence.EventoSalidaJpaRepository;
import com.crowdfunding.contribution.sharedkernel.EventoDeDominio;
import org.springframework.stereotype.Component;
import tools.jackson.databind.json.JsonMapper;

/**
 * Transactional Outbox, primera mitad: en vez de enviar el evento a RabbitMQ, lo guarda en la tabla
 * {@code eventos_salida} dentro de la misma transacción que guarda el aporte. Así nunca hay un
 * aporte sin su evento ni un evento sin su aporte. El envío lo hace después {@link
 * PublicadorOutboxProgramado}.
 */
@Component
public class PublicadorEventosOutbox implements PublicadorEventosPuerto {

  /**
   * Mapper propio y con la configuración por defecto: el JSON del contrato no depende de cómo se
   * configure el JSON del API. Los campos sin valor salen como {@code null}, como pide la ficha.
   */
  private static final JsonMapper JSON = JsonMapper.builder().build();

  private final EventoSalidaJpaRepository eventosSalida;

  public PublicadorEventosOutbox(EventoSalidaJpaRepository eventosSalida) {
    this.eventosSalida = eventosSalida;
  }

  @Override
  public void publicar(EventoDeDominio evento) {
    if (!(evento instanceof AporteRealizado aporteRealizado)) {
      throw new IllegalArgumentException(
          "No hay un evento de integración para " + evento.getClass().getSimpleName());
    }
    SobreEvento<AporteRegistrado> sobre = AporteRegistrado.desde(aporteRealizado);
    eventosSalida.save(
        new EventoSalidaJpaEntity(
            sobre.idEvento(),
            sobre.tipoEvento(),
            JSON.writeValueAsString(sobre),
            evento.ocurridoEn()));
  }
}
