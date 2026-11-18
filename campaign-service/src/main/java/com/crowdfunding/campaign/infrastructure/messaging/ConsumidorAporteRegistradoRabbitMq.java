package com.crowdfunding.campaign.infrastructure.messaging;

import an.awesome.pipelinr.Pipeline;
import com.crowdfunding.campaign.application.command.RegistrarAporteEnCampanaComando;
import com.crowdfunding.campaign.infrastructure.persistence.EventoProcesadoJpaEntity;
import com.crowdfunding.campaign.infrastructure.persistence.SpringDataEventoProcesadoJpaRepository;
import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.boot.json.JsonParserFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
public class ConsumidorAporteRegistradoRabbitMq {

  private static final Logger log =
      LoggerFactory.getLogger(ConsumidorAporteRegistradoRabbitMq.class);
  public static final String TIPO_EVENTO_APORTE_REGISTRADO = "aporte.registrado";

  private final SpringDataEventoProcesadoJpaRepository eventoProcesadoRepository;
  private final Pipeline pipeline;

  public ConsumidorAporteRegistradoRabbitMq(
      SpringDataEventoProcesadoJpaRepository eventoProcesadoRepository, Pipeline pipeline) {
    this.eventoProcesadoRepository = Objects.requireNonNull(eventoProcesadoRepository);
    this.pipeline = Objects.requireNonNull(pipeline);
  }

  @RabbitListener(queues = "${campana.mensajeria.cola-aportes:campaign-service.aportes}")
  @Transactional
  public void consumirMensaje(String cuerpoJson) {
    procesarAporteRegistradoJson(cuerpoJson);
  }

  @Transactional
  @SuppressWarnings("unchecked")
  public boolean procesarAporteRegistradoJson(String cuerpoJson) {
    if (cuerpoJson == null || cuerpoJson.isBlank()) {
      throw new IllegalArgumentException("El mensaje de evento recibido esta vacio");
    }

    Map<String, Object> sobre = JsonParserFactory.getJsonParser().parseMap(cuerpoJson);
    UUID idEvento = exigirUuid(sobre.get("idEvento"), "idEvento");
    String tipoEvento = exigirTexto(sobre.get("tipoEvento"), "tipoEvento");

    if (!TIPO_EVENTO_APORTE_REGISTRADO.equals(tipoEvento)) {
      throw new IllegalArgumentException("Tipo de evento no soportado en esta cola: " + tipoEvento);
    }

    Object versionObj = sobre.get("version");
    if (!(versionObj instanceof Number numeroVersion) || numeroVersion.intValue() != 1) {
      throw new IllegalArgumentException("Version de contrato no soportada: " + versionObj);
    }

    if (eventoProcesadoRepository.existsById(idEvento)) {
      log.info("Evento {} ya fue procesado previamente; se ignora por idempotencia.", idEvento);
      return false;
    }

    Instant ocurridoEn = parsearInstante(sobre.get("ocurridoEn"));
    Object datosObj = sobre.get("datos");
    if (!(datosObj instanceof Map<?, ?> mapaDatos)) {
      throw new IllegalArgumentException("El campo 'datos' del evento es obligatorio");
    }

    Map<String, Object> datos = (Map<String, Object>) mapaDatos;
    UUID idAporte = exigirUuid(datos.get("idAporte"), "idAporte");
    UUID idCampana = exigirUuid(datos.get("idCampana"), "idCampana");
    String monto = exigirTexto(datos.get("monto"), "monto");
    String moneda = exigirTexto(datos.get("moneda"), "moneda");

    pipeline.send(new RegistrarAporteEnCampanaComando(idCampana, monto, moneda, ocurridoEn));

    eventoProcesadoRepository.save(
        new EventoProcesadoJpaEntity(idEvento, tipoEvento, idAporte, Instant.now()));

    return true;
  }

  private UUID exigirUuid(Object valor, String nombreCampo) {
    String texto = exigirTexto(valor, nombreCampo);
    try {
      return UUID.fromString(texto);
    } catch (IllegalArgumentException ex) {
      throw new IllegalArgumentException("El campo '" + nombreCampo + "' no es un UUID valido", ex);
    }
  }

  private String exigirTexto(Object valor, String nombreCampo) {
    if (valor == null || valor.toString().isBlank()) {
      throw new IllegalArgumentException("El campo '" + nombreCampo + "' es obligatorio");
    }
    return valor.toString().trim();
  }

  private Instant parsearInstante(Object valor) {
    if (valor == null || valor.toString().isBlank()) {
      return Instant.now();
    }
    return Instant.parse(valor.toString().trim());
  }
}
