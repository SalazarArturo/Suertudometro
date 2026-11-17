package com.crowdfunding.contribution.api.security;

import java.util.List;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** Registra en Spring MVC cómo se obtiene el {@link UsuarioActual} de un controlador. */
@Configuration
public class ConfiguracionWeb implements WebMvcConfigurer {

  @Override
  public void addArgumentResolvers(List<HandlerMethodArgumentResolver> resolvedores) {
    resolvedores.add(new ResolvedorUsuarioActual());
  }
}
