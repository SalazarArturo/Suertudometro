package com.crowdfunding.gateway.errores;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.web.server.ServerAuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

/**
 * Responde 401 {@code no-autenticado}, el mismo código que identity-service, cuando falta el token
 * en una ruta que requiere sesión o el token no sirve (api-gateway.md §5).
 */
@Component
public class PuntoDeEntradaNoAutenticado implements ServerAuthenticationEntryPoint {

  private final Problemas problemas;

  public PuntoDeEntradaNoAutenticado(Problemas problemas) {
    this.problemas = problemas;
  }

  @Override
  public Mono<Void> commence(ServerWebExchange intercambio, AuthenticationException error) {
    // OAuth2AuthenticationException: vino un token, pero es inválido, vencido o mal formado.
    boolean tokenInvalido = error instanceof OAuth2AuthenticationException;
    intercambio
        .getResponse()
        .getHeaders()
        .set(
            HttpHeaders.WWW_AUTHENTICATE,
            tokenInvalido ? "Bearer error=\"invalid_token\"" : "Bearer");
    String motivo = tokenInvalido ? "el token no es válido o venció." : "falta el token.";
    return problemas.escribir(
        intercambio,
        HttpStatus.UNAUTHORIZED,
        "no-autenticado",
        "Hace falta iniciar sesión: " + motivo);
  }
}
