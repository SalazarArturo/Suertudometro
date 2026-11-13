package com.crowdfunding.gateway;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JOSEObjectType;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/** Tokens como los que emite identity-service (identity-service.md §5.1), para las pruebas. */
final class Tokens {

  static final String SECRETO = "un-secreto-de-prueba-de-al-menos-32-bytes";
  static final String ID_USUARIO = "e3b68016-9750-41b3-9e34-762dd8346001";

  private Tokens() {}

  /** Los claims de un token vigente por una hora. */
  static JWTClaimsSet.Builder claims() {
    Instant ahora = Instant.now();
    return new JWTClaimsSet.Builder()
        .subject(ID_USUARIO)
        .claim("correo", "ana@example.org")
        .claim("nombre", "Ana Pérez")
        .claim("rol", "USUARIO")
        .issueTime(Date.from(ahora))
        .expirationTime(Date.from(ahora.plusSeconds(3600)));
  }

  static String valido() {
    return firmar(SECRETO, claims().build());
  }

  static String firmar(String secreto, JWTClaimsSet claims) {
    try {
      var jwt =
          new SignedJWT(
              new JWSHeader.Builder(JWSAlgorithm.HS256).type(JOSEObjectType.JWT).build(), claims);
      jwt.sign(new MACSigner(secreto.getBytes(StandardCharsets.UTF_8)));
      return jwt.serialize();
    } catch (JOSEException error) {
      throw new IllegalStateException(error);
    }
  }
}
