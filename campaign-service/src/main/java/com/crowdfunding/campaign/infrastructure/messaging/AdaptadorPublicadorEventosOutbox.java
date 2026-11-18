package com.crowdfunding.campaign.infrastructure.messaging;

import com.crowdfunding.campaign.application.port.out.PublicadorEventosPuerto;
import com.crowdfunding.campaign.domain.event.CampanaAprobada;
import com.crowdfunding.campaign.domain.event.CampanaCancelada;
import com.crowdfunding.campaign.domain.event.CampanaFinalizada;
import com.crowdfunding.campaign.domain.event.CampanaRechazada;
import com.crowdfunding.campaign.domain.event.MetaAlcanzada;
import com.crowdfunding.campaign.domain.model.EstadoCampana;
import com.crowdfunding.campaign.domain.model.MotivoCierre;
import com.crowdfunding.campaign.infrastructure.persistence.EventoSalidaJpaEntity;
import com.crowdfunding.campaign.infrastructure.persistence.SpringDataEventoSalidaJpaRepository;
import com.crowdfunding.campaign.sharedkernel.EventoDeDominio;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class AdaptadorPublicadorEventosOutbox implements PublicadorEventosPuerto {

  public static final int VERSION_CONTRATO = 1;

  private final SpringDataEventoSalidaJpaRepository eventoSalidaRepository;

  public AdaptadorPublicadorEventosOutbox(
      SpringDataEventoSalidaJpaRepository eventoSalidaRepository) {
    this.eventoSalidaRepository = Objects.requireNonNull(eventoSalidaRepository);
  }

  @Override
  public void publicar(List<EventoDeDominio> eventos) {
    if (eventos == null || eventos.isEmpty()) {
      return;
    }
    for (EventoDeDominio evento : eventos) {
      convertirAEventoSalida(evento).ifPresent(eventoSalidaRepository::save);
    }
  }

  public Optional<EventoSalidaJpaEntity> convertirAEventoSalida(EventoDeDominio evento) {
    if (evento instanceof CampanaAprobada aprobada) {
      String tipo = "campana.publicada";
      Map<String, Object> datos = new LinkedHashMap<>();
      datos.put("idCampana", aprobada.obtenerIdCampana().toString());
      datos.put("idOrganizador", aprobada.obtenerIdOrganizador().toString());
      datos.put("titulo", aprobada.obtenerTitulo());
      datos.put("historia", aprobada.obtenerResumen());
      datos.put("categoria", aprobada.obtenerCategoria().name());
      datos.put("rutaPortada", aprobada.obtenerUrlPortada());
      datos.put("metaFinanciera", aprobada.obtenerMetaFinanciera().comoTexto());
      datos.put("moneda", aprobada.obtenerMetaFinanciera().moneda());
      datos.put("fechaLimite", aprobada.obtenerFechaLimite().toString());

      return Optional.of(crearEntidadOutbox(aprobada, tipo, datos));
    }

    if (evento instanceof CampanaRechazada rechazada) {
      String tipo = "campana.rechazada";
      Map<String, Object> datos = new LinkedHashMap<>();
      datos.put("idCampana", rechazada.obtenerIdCampana().toString());
      datos.put("idOrganizador", rechazada.obtenerIdOrganizador().toString());
      datos.put("observaciones", rechazada.obtenerObservaciones());

      return Optional.of(crearEntidadOutbox(rechazada, tipo, datos));
    }

    if (evento instanceof MetaAlcanzada meta) {
      String tipo = "meta.alcanzada";
      Map<String, Object> datos = new LinkedHashMap<>();
      datos.put("idCampana", meta.obtenerIdCampana().toString());
      datos.put("metaFinanciera", meta.obtenerMetaFinanciera().comoTexto());
      datos.put("montoRecaudado", meta.obtenerMontoRecaudado().comoTexto());
      datos.put("moneda", meta.obtenerMontoRecaudado().moneda());

      return Optional.of(crearEntidadOutbox(meta, tipo, datos));
    }

    if (evento instanceof CampanaFinalizada finalizada) {
      String tipo = "campana.cerrada";
      Map<String, Object> datos = new LinkedHashMap<>();
      datos.put("idCampana", finalizada.obtenerIdCampana().toString());
      datos.put("estadoFinal", EstadoCampana.FINALIZADA.name());
      datos.put("motivoCierre", finalizada.obtenerMotivoCierre().name());

      return Optional.of(crearEntidadOutbox(finalizada, tipo, datos));
    }

    if (evento instanceof CampanaCancelada cancelada) {
      String tipo = "campana.cerrada";
      Map<String, Object> datos = new LinkedHashMap<>();
      datos.put("idCampana", cancelada.obtenerIdCampana().toString());
      datos.put("estadoFinal", EstadoCampana.CANCELADA.name());
      datos.put("motivoCierre", MotivoCierre.CANCELACION.name());

      return Optional.of(crearEntidadOutbox(cancelada, tipo, datos));
    }

    return Optional.empty();
  }

  private EventoSalidaJpaEntity crearEntidadOutbox(
      EventoDeDominio evento, String tipoEvento, Map<String, Object> datos) {
    String json =
        SerializadorEventosIntegracion.aJson(
            evento.obtenerIdEvento().toString(),
            tipoEvento,
            VERSION_CONTRATO,
            evento.obtenerOcurridoEn().toString(),
            datos);

    return new EventoSalidaJpaEntity(
        evento.obtenerIdEvento(), tipoEvento, tipoEvento, json, evento.obtenerOcurridoEn());
  }
}
