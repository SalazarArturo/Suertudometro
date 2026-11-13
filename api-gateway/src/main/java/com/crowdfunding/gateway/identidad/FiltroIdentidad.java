package com.crowdfunding.gateway.identidad;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.http.HttpHeaders;
import org.springframework.security.core.context.ReactiveSecurityContextHolder;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import org.springframework.web.util.UriUtils;
import reactor.core.publisher.Mono;

/**
 * Traduce el token a los headers del contrato de identidad (identity-service.md §5.1).
 *
 * <p>Borra los {@code X-Usuario-*} y el {@code Authorization} que mandó el cliente. Si el token es
 * válido, agrega los tres headers con sus claims. Así nadie puede hacerse pasar por otro usuario, y
 * los servicios no dependen del JWT ni ven el token.
 */
@Component
public class FiltroIdentidad implements GlobalFilter, Ordered {

  public static final String CABECERA_ID = "X-Usuario-Id";
  public static final String CABECERA_ROL = "X-Usuario-Rol";
  public static final String CABECERA_NOMBRE = "X-Usuario-Nombre";

  private static final String PREFIJO_CABECERAS = "x-usuario-";

  @Override
  public Mono<Void> filter(ServerWebExchange intercambio, GatewayFilterChain cadena) {
    return ReactiveSecurityContextHolder.getContext()
        .map(SecurityContext::getAuthentication)
        .filter(JwtAuthenticationToken.class::isInstance)
        .map(autenticacion -> Optional.of(((JwtAuthenticationToken) autenticacion).getToken()))
        .defaultIfEmpty(Optional.empty())
        .flatMap(token ->
            cadena.filter(
                intercambio
                    .mutate()
                    .request(
                        peticion -> peticion.headers(cabeceras -> reescribir(cabeceras, token)))
                    .build()));
  }

  /** Deja en {@code cabeceras} solo la identidad que respalda el token, si hay uno. */
  static void reescribir(HttpHeaders cabeceras, Optional<Jwt> token) {
    List.copyOf(cabeceras.headerNames()).stream()
        .filter(nombre -> nombre.toLowerCase(Locale.ROOT).startsWith(PREFIJO_CABECERAS))
        .forEach(cabeceras::remove);
    cabeceras.remove(HttpHeaders.AUTHORIZATION);

    token.ifPresent(jwt -> {
      cabeceras.set(CABECERA_ID, jwt.getSubject());
      cabeceras.set(CABECERA_ROL, jwt.getClaimAsString("rol"));
      // Un header no admite tildes ni ñ: el nombre viaja codificado para URL, en UTF-8.
      cabeceras.set(
          CABECERA_NOMBRE, UriUtils.encode(jwt.getClaimAsString("nombre"), StandardCharsets.UTF_8));
    });
  }

  /** Antes de que Spring Cloud Gateway reenvíe la petición al servicio. */
  @Override
  public int getOrder() {
    return 0;
  }
}
