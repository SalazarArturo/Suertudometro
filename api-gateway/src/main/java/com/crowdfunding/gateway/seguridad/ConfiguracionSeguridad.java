package com.crowdfunding.gateway.seguridad;

import com.crowdfunding.gateway.configuracion.PropiedadesGateway;
import com.crowdfunding.gateway.errores.PuntoDeEntradaNoAutenticado;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.reactive.EnableWebFluxSecurity;
import org.springframework.security.config.web.server.ServerHttpSecurity;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.NimbusReactiveJwtDecoder;
import org.springframework.security.oauth2.jwt.ReactiveJwtDecoder;
import org.springframework.security.web.server.SecurityWebFilterChain;
import org.springframework.security.web.server.context.NoOpServerSecurityContextRepository;
import org.springframework.security.web.server.savedrequest.NoOpServerRequestCache;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.reactive.CorsConfigurationSource;
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource;

/**
 * Quién puede llamar a cada ruta y cómo se valida el token (api-gateway.md §3, §4 y §6).
 *
 * <p>El gateway solo autentica: con un token válido la petición sigue, y el rol lo revisa cada
 * servicio con los headers {@code X-Usuario-*}.
 */
@Configuration(proxyBeanMethods = false)
@EnableWebFluxSecurity
public class ConfiguracionSeguridad {

  @Bean
  SecurityWebFilterChain cadenaDeSeguridad(
      ServerHttpSecurity http,
      PropiedadesGateway propiedades,
      PuntoDeEntradaNoAutenticado puntoDeEntrada) {
    return http
        // API sin cookies ni formularios: el token viaja en un header, así que no hay CSRF.
        .csrf(ServerHttpSecurity.CsrfSpec::disable)
        .httpBasic(ServerHttpSecurity.HttpBasicSpec::disable)
        .formLogin(ServerHttpSecurity.FormLoginSpec::disable)
        .logout(ServerHttpSecurity.LogoutSpec::disable)
        // Sin estado: cada petición trae su token y no se guarda nada entre peticiones.
        .securityContextRepository(NoOpServerSecurityContextRepository.getInstance())
        .requestCache(cache -> cache.requestCache(NoOpServerRequestCache.getInstance()))
        // CORS va antes que la autenticación: el preflight no lleva token.
        .cors(Customizer.withDefaults())
        .authorizeExchange(rutas -> {
          rutas.pathMatchers(HttpMethod.GET, "/salud").permitAll();
          propiedades
              .publicas()
              .forEach(ruta -> rutas.pathMatchers(ruta.metodo(), ruta.patron()).permitAll());
          // Una ruta nueva nace protegida.
          rutas.anyExchange().authenticated();
        })
        // Un token inválido o vencido da 401 aunque la ruta sea pública.
        .oauth2ResourceServer(servidor ->
            servidor.jwt(Customizer.withDefaults()).authenticationEntryPoint(puntoDeEntrada))
        .exceptionHandling(errores -> errores.authenticationEntryPoint(puntoDeEntrada))
        .build();
  }

  /** Valida la firma HS256 con {@code JWT_SECRETO} (otro algoritmo se rechaza) y los claims. */
  @Bean
  ReactiveJwtDecoder decodificadorJwt(PropiedadesGateway propiedades) {
    var clave =
        new SecretKeySpec(
            propiedades.jwt().secreto().getBytes(StandardCharsets.UTF_8), "HmacSHA256");
    var decodificador =
        NimbusReactiveJwtDecoder.withSecretKey(clave).macAlgorithm(MacAlgorithm.HS256).build();
    decodificador.setJwtValidator(ValidadorTokens.crear());
    return decodificador;
  }

  /**
   * CORS para el frontend. Sin credenciales: el token viaja en un header, no en cookies. Spring
   * Security pone estos headers también en las respuestas de error, como el 401.
   */
  @Bean
  CorsConfigurationSource configuracionCors(PropiedadesGateway propiedades) {
    var cors = new CorsConfiguration();
    cors.setAllowedOrigins(propiedades.cors().origenes());
    cors.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
    cors.setAllowedHeaders(List.of(HttpHeaders.AUTHORIZATION, HttpHeaders.CONTENT_TYPE));
    cors.setExposedHeaders(List.of(HttpHeaders.LOCATION));
    cors.setAllowCredentials(false);
    cors.setMaxAge(Duration.ofHours(1));
    var fuente = new UrlBasedCorsConfigurationSource();
    fuente.registerCorsConfiguration("/**", cors);
    return fuente;
  }
}
