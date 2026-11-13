package com.crowdfunding.gateway.seguridad;

import java.util.Objects;
import java.util.Set;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;

/**
 * Reglas que un token cumple además de la firma (api-gateway.md §4 e identity-service.md §5.1):
 * vence ({@code exp} obligatorio, con 60 s de tolerancia de reloj) y trae los claims que el gateway
 * convierte en headers.
 */
final class ValidadorTokens {

  static final Set<String> ROLES = Set.of("USUARIO", "ADMINISTRADOR");

  private ValidadorTokens() {}

  static OAuth2TokenValidator<Jwt> crear() {
    // createDefaultWithValidators incluye la revisión de exp y nbf.
    return JwtValidators.createDefaultWithValidators(
        new JwtClaimValidator<>(JwtClaimNames.EXP, Objects::nonNull),
        new JwtClaimValidator<>(JwtClaimNames.SUB, ValidadorTokens::esTexto),
        new JwtClaimValidator<>("nombre", ValidadorTokens::esTexto),
        new JwtClaimValidator<>(
            "rol", rol -> rol instanceof String texto && ROLES.contains(texto)));
  }

  private static boolean esTexto(Object valor) {
    return valor instanceof String texto && !texto.isBlank();
  }
}
