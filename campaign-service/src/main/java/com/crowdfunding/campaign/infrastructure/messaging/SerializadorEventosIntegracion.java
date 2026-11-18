package com.crowdfunding.campaign.infrastructure.messaging;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

public final class SerializadorEventosIntegracion {

  private SerializadorEventosIntegracion() {}

  public static String aJson(
      String idEvento,
      String tipoEvento,
      int version,
      String ocurridoEn,
      Map<String, Object> datos) {
    Map<String, Object> sobre = new LinkedHashMap<>();
    sobre.put("idEvento", idEvento);
    sobre.put("tipoEvento", tipoEvento);
    sobre.put("version", version);
    sobre.put("ocurridoEn", ocurridoEn);
    sobre.put("datos", datos);
    return serializarMapa(sobre);
  }

  @SuppressWarnings("unchecked")
  private static String serializarValor(Object valor) {
    if (valor == null) {
      return "null";
    }
    if (valor instanceof Number || valor instanceof Boolean) {
      return valor.toString();
    }
    if (valor instanceof Map<?, ?> mapa) {
      return serializarMapa((Map<String, Object>) mapa);
    }
    return "\"" + escaparJson(valor.toString()) + "\"";
  }

  private static String serializarMapa(Map<String, Object> mapa) {
    return mapa.entrySet().stream()
        .map(e -> "\"" + escaparJson(e.getKey()) + "\":" + serializarValor(e.getValue()))
        .collect(Collectors.joining(",", "{", "}"));
  }

  private static String escaparJson(String texto) {
    StringBuilder sb = new StringBuilder(texto.length());
    for (int i = 0; i < texto.length(); i++) {
      char c = texto.charAt(i);
      switch (c) {
        case '"' -> sb.append("\\\"");
        case '\\' -> sb.append("\\\\");
        case '\b' -> sb.append("\\b");
        case '\f' -> sb.append("\\f");
        case '\n' -> sb.append("\\n");
        case '\r' -> sb.append("\\r");
        case '\t' -> sb.append("\\t");
        default -> {
          if (c < 0x20) {
            sb.append(String.format("\\u%04x", (int) c));
          } else {
            sb.append(c);
          }
        }
      }
    }
    return sb.toString();
  }
}
