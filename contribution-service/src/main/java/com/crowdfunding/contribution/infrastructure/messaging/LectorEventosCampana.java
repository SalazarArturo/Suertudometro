package com.crowdfunding.contribution.infrastructure.messaging;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import com.crowdfunding.contribution.application.eventhandler.CampanaCerrada;
import com.crowdfunding.contribution.application.eventhandler.CampanaPublicada;
import com.crowdfunding.contribution.domain.model.EstadoCampanaAportable;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.format.DateTimeParseException;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

/**
 * Traduce el JSON de un mensaje de campaign-service al evento que entiende la capa de aplicación
 * (capa anticorrupción). Lee solo los campos de las fichas {@code CampanaPublicada} y {@code
 * CampanaCerrada} de docs/contratos-de-eventos.md que este servicio necesita, e ignora el resto.
 */
@Component
public class LectorEventosCampana {

  private static final JsonMapper JSON = JsonMapper.builder().build();

  /**
   * @throws MensajeInvalidoExcepcion si el mensaje no es JSON, le falta un campo o trae un valor
   *     que el contrato no admite
   */
  public Command<Voidy> leer(byte[] cuerpo) {
    JsonNode sobre = aJson(cuerpo);
    UUID idEvento = uuid(sobre, "idEvento");
    String tipoEvento = texto(sobre, "tipoEvento");
    JsonNode datos = sobre.path("datos");
    if (!datos.isObject()) {
      throw new MensajeInvalidoExcepcion("Falta el objeto 'datos'");
    }

    return switch (tipoEvento) {
      case CampanaPublicada.TIPO_EVENTO ->
          new CampanaPublicada(
              idEvento,
              uuid(datos, "idCampana"),
              uuid(datos, "idOrganizador"),
              texto(datos, "titulo"),
              texto(datos, "moneda"),
              instante(datos, "fechaLimite"));
      case CampanaCerrada.TIPO_EVENTO ->
          new CampanaCerrada(idEvento, uuid(datos, "idCampana"), estadoFinal(datos));
      default -> throw new MensajeInvalidoExcepcion("tipoEvento desconocido: " + tipoEvento);
    };
  }

  /**
   * El estado en que queda la campaña. Manda {@code estadoFinal}; si no viniera, se deduce de
   * {@code motivoCierre}: CANCELACION es CANCELADA, y los demás motivos son FINALIZADA (ADR 0003).
   */
  private static EstadoCampanaAportable estadoFinal(JsonNode datos) {
    if (datos.path("estadoFinal").isString()) {
      String estadoFinal = datos.path("estadoFinal").asString();
      return switch (estadoFinal) {
        case "FINALIZADA" -> EstadoCampanaAportable.FINALIZADA;
        case "CANCELADA" -> EstadoCampanaAportable.CANCELADA;
        default -> throw new MensajeInvalidoExcepcion("estadoFinal desconocido: " + estadoFinal);
      };
    }
    String motivoCierre = texto(datos, "motivoCierre");
    return "CANCELACION".equals(motivoCierre)
        ? EstadoCampanaAportable.CANCELADA
        : EstadoCampanaAportable.FINALIZADA;
  }

  private static JsonNode aJson(byte[] cuerpo) {
    try {
      JsonNode sobre = JSON.readTree(cuerpo);
      if (sobre == null || !sobre.isObject()) {
        throw new MensajeInvalidoExcepcion("El mensaje no es un objeto JSON");
      }
      return sobre;
    } catch (JacksonException error) {
      throw new MensajeInvalidoExcepcion("El mensaje no es JSON válido", error);
    }
  }

  private static String texto(JsonNode nodo, String campo) {
    JsonNode valor = nodo.path(campo);
    if (!valor.isString() || valor.asString().isBlank()) {
      throw new MensajeInvalidoExcepcion("Falta el campo de texto '" + campo + "'");
    }
    return valor.asString();
  }

  private static UUID uuid(JsonNode nodo, String campo) {
    String valor = texto(nodo, campo);
    try {
      return UUID.fromString(valor);
    } catch (IllegalArgumentException error) {
      throw new MensajeInvalidoExcepcion("El campo '" + campo + "' no es un UUID", error);
    }
  }

  private static Instant instante(JsonNode nodo, String campo) {
    String valor = texto(nodo, campo);
    try {
      // Acepta "2026-12-01T00:00:00Z" y también "2026-12-01T00:00:00+00:00".
      return OffsetDateTime.parse(valor).toInstant();
    } catch (DateTimeParseException error) {
      throw new MensajeInvalidoExcepcion(
          "El campo '" + campo + "' no es una fecha ISO 8601 con zona horaria", error);
    }
  }
}
