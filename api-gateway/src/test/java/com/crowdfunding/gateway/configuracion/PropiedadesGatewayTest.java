package com.crowdfunding.gateway.configuracion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.crowdfunding.gateway.ApiGatewayApplication;
import com.crowdfunding.gateway.configuracion.PropiedadesGateway.Jwt;
import com.crowdfunding.gateway.configuracion.PropiedadesGateway.RutaPublica;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.http.HttpMethod;

class PropiedadesGatewayTest {

  private static final String SECRETO = "un-secreto-de-prueba-de-al-menos-32-bytes";

  @ParameterizedTest(name = "JWT_SECRETO \"{0}\" es obligatoria")
  @ValueSource(strings = {"", "   "})
  void exigeElSecreto(String secreto) {
    assertThatThrownBy(() -> new Jwt(secreto)).hasMessage("JWT_SECRETO es obligatoria");
  }

  @Test
  @DisplayName("sin el bloque jwt también exige el secreto")
  void sinBloqueJwt() {
    assertThatThrownBy(() -> new PropiedadesGateway(null, null, null))
        .hasMessage("JWT_SECRETO es obligatoria");
  }

  @Test
  @DisplayName("rechaza un secreto de menos de 32 bytes")
  void secretoCorto() {
    assertThatThrownBy(() -> new Jwt("corto"))
        .hasMessage("JWT_SECRETO debe tener al menos 32 bytes");
  }

  @Test
  @DisplayName("cuenta los bytes del secreto, no los caracteres")
  void cuentaBytes() {
    // 16 eñes son 16 caracteres, pero 32 bytes en UTF-8.
    assertThat(new Jwt("ñ".repeat(16)).secreto()).hasSize(16);
  }

  @Test
  @DisplayName("interpreta las rutas públicas, con el método en mayúsculas o minúsculas")
  void interpretaRutasPublicas() {
    var propiedades =
        new PropiedadesGateway(
            new Jwt(SECRETO),
            null,
            List.of("POST /api/identidad/sesiones", "get /api/identidad/docs/**"));

    assertThat(propiedades.publicas())
        .containsExactly(
            new RutaPublica(HttpMethod.POST, "/api/identidad/sesiones"),
            new RutaPublica(HttpMethod.GET, "/api/identidad/docs/**"));
  }

  @ParameterizedTest(name = "rechaza la ruta pública \"{0}\"")
  @ValueSource(strings = {"POST", "/api/identidad", "TRAER /api/x", "POST api/x", "POST /a /b"})
  void rechazaRutasMalEscritas(String ruta) {
    assertThatThrownBy(() -> new PropiedadesGateway(new Jwt(SECRETO), null, List.of(ruta)))
        .hasMessageContaining("Ruta pública mal escrita");
  }

  @Test
  @DisplayName("el gateway no arranca con un JWT_SECRETO corto, y el log dice por qué")
  void noArrancaConSecretoCorto() {
    var aplicacion =
        new SpringApplicationBuilder(ApiGatewayApplication.class)
            .properties("JWT_SECRETO=corto", "server.port=0");

    assertThatThrownBy(aplicacion::run)
        .hasRootCauseMessage("JWT_SECRETO debe tener al menos 32 bytes");
  }
}
