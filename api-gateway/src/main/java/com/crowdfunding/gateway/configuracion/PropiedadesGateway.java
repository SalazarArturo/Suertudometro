package com.crowdfunding.gateway.configuracion;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.http.HttpMethod;

/**
 * Configuración propia del gateway (prefijo {@code suertudometro}). Se valida al arrancar: si falta
 * algo o está mal escrito, el gateway no arranca y el log dice qué (api-gateway.md §7).
 *
 * @param jwt el secreto para validar los tokens
 * @param cors los orígenes del frontend
 * @param rutasPublicas las rutas que no piden token, como "MÉTODO /patrón"
 */
@ConfigurationProperties("suertudometro")
public record PropiedadesGateway(Jwt jwt, Cors cors, List<String> rutasPublicas) {

  public PropiedadesGateway {
    jwt = jwt == null ? new Jwt(null) : jwt;
    cors = cors == null ? new Cors(List.of()) : cors;
    rutasPublicas = rutasPublicas == null ? List.of() : List.copyOf(rutasPublicas);
    rutasPublicas.forEach(RutaPublica::desde);
  }

  /** Las rutas públicas ya interpretadas. */
  public List<RutaPublica> publicas() {
    return rutasPublicas.stream().map(RutaPublica::desde).toList();
  }

  /**
   * {@code JWT_SECRETO}: el mismo secreto con el que identity-service firma los tokens (HS256).
   *
   * @param secreto el secreto, de 32 bytes o más
   */
  public record Jwt(String secreto) {

    /** HS256 necesita una clave de al menos 256 bits. */
    public static final int BYTES_MINIMOS = 32;

    public Jwt {
      if (secreto == null || secreto.isBlank()) {
        throw new IllegalArgumentException("JWT_SECRETO es obligatoria");
      }
      if (secreto.getBytes(StandardCharsets.UTF_8).length < BYTES_MINIMOS) {
        throw new IllegalArgumentException(
            "JWT_SECRETO debe tener al menos " + BYTES_MINIMOS + " bytes");
      }
    }
  }

  /**
   * {@code CORS_ORIGENES}: los orígenes del frontend que pueden llamar al API.
   *
   * @param origenes por ejemplo, {@code http://localhost:4200}
   */
  public record Cors(List<String> origenes) {

    public Cors {
      origenes = origenes == null ? List.of() : List.copyOf(origenes);
    }
  }

  /**
   * Una ruta que no pide token.
   *
   * @param metodo el método HTTP
   * @param patron el patrón de la ruta, por ejemplo {@code /api/identidad/docs/**}
   */
  public record RutaPublica(HttpMethod metodo, String patron) {

    private static final List<String> METODOS =
        List.of("GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");

    /** Interpreta "MÉTODO /patrón", por ejemplo "POST /api/identidad/sesiones". */
    public static RutaPublica desde(String texto) {
      String[] partes = texto == null ? new String[0] : texto.trim().split("\\s+");
      if (partes.length != 2
          || !METODOS.contains(partes[0].toUpperCase(Locale.ROOT))
          || !partes[1].startsWith("/")) {
        throw new IllegalArgumentException(
            "Ruta pública mal escrita: \""
                + texto
                + "\". Debe ser \"MÉTODO /patrón\", como \"POST /api/identidad/sesiones\".");
      }
      return new RutaPublica(HttpMethod.valueOf(partes[0].toUpperCase(Locale.ROOT)), partes[1]);
    }
  }
}
