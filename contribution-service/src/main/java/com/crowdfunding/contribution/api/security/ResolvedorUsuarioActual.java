package com.crowdfunding.contribution.api.security;

import com.crowdfunding.contribution.api.exception.NoAutenticadoExcepcion;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.UUID;
import org.springframework.core.MethodParameter;
import org.springframework.web.bind.support.WebDataBinderFactory;
import org.springframework.web.context.request.NativeWebRequest;
import org.springframework.web.method.support.HandlerMethodArgumentResolver;
import org.springframework.web.method.support.ModelAndViewContainer;

/**
 * Arma el {@link UsuarioActual} de un controlador con el contrato de identidad
 * (docs/servicios/identity-service.md §5.1).
 *
 * <p>El servicio no valida el JWT ni lo ve: confía en los headers porque solo el gateway llega a
 * él, y el gateway borra los {@code X-Usuario-*} que mande el cliente. Exige los tres headers, como
 * identity-service.
 */
public class ResolvedorUsuarioActual implements HandlerMethodArgumentResolver {

  public static final String CABECERA_ID = "X-Usuario-Id";
  public static final String CABECERA_ROL = "X-Usuario-Rol";
  public static final String CABECERA_NOMBRE = "X-Usuario-Nombre";

  @Override
  public boolean supportsParameter(MethodParameter parametro) {
    return UsuarioActual.class.equals(parametro.getParameterType());
  }

  @Override
  public UsuarioActual resolveArgument(
      MethodParameter parametro,
      ModelAndViewContainer contenedor,
      NativeWebRequest peticion,
      WebDataBinderFactory fabrica) {
    String id = peticion.getHeader(CABECERA_ID);
    String rol = peticion.getHeader(CABECERA_ROL);
    String nombre = peticion.getHeader(CABECERA_NOMBRE);
    if (id == null || rol == null || nombre == null) {
      throw new NoAutenticadoExcepcion();
    }
    try {
      // El gateway manda el nombre codificado para URL en UTF-8: un header no admite tildes ni ñ.
      String nombreDecodificado = URLDecoder.decode(nombre, StandardCharsets.UTF_8);
      if (nombreDecodificado.isBlank()) {
        throw new NoAutenticadoExcepcion();
      }
      return new UsuarioActual(UUID.fromString(id), RolUsuario.valueOf(rol), nombreDecodificado);
    } catch (IllegalArgumentException error) {
      // El id no es un UUID, el rol no existe o el nombre está mal codificado.
      throw new NoAutenticadoExcepcion();
    }
  }
}
