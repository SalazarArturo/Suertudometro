package com.crowdfunding.contribution.api.exception;

import com.crowdfunding.contribution.application.exception.AccesoDenegadoExcepcion;
import com.crowdfunding.contribution.application.exception.RecursoNoEncontradoExcepcion;
import com.crowdfunding.contribution.sharedkernel.ExcepcionReglaDeNegocio;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.TypeMismatchException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.ServletWebRequest;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.method.annotation.HandlerMethodValidationException;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;

/**
 * Convierte todas las excepciones en errores RFC 9457 en español (contribution-service.md §5).
 *
 * <ul>
 *   <li>Regla del dominio incumplida: {@code 400} con el código de la regla, salvo las del catálogo
 *       {@link #ESTADO_POR_CODIGO}.
 *   <li>Petición mal formada: {@code 400 validacion}, con la lista {@code errores} por campo, que
 *       es la que lee el frontend (docs/frontend.md §5).
 *   <li>Errores propios de Spring MVC (ruta inexistente, JSON ilegible…): su estado, con {@code
 *       type: about:blank}.
 * </ul>
 */
@RestControllerAdvice
public class ManejadorGlobalExcepciones extends ResponseEntityExceptionHandler {

  private static final Logger LOG = LoggerFactory.getLogger(ManejadorGlobalExcepciones.class);

  private static final String VALIDACION = "validacion";
  private static final String DETALLE_VALIDACION = "Los datos enviados no son válidos.";

  /**
   * Reglas del dominio que no responden {@code 400}. La campaña que ya no acepta aportes es un
   * conflicto con el estado del recurso, no un dato mal escrito.
   */
  private static final Map<String, HttpStatus> ESTADO_POR_CODIGO =
      Map.of("campana-no-acepta-aportes", HttpStatus.CONFLICT);

  private static final Map<Integer, String> DETALLE_POR_ESTADO =
      Map.of(
          400, "La petición no es válida. Revisa el formato del JSON y de los parámetros.",
          404, "No existe la ruta solicitada.",
          405, "El método HTTP no está permitido en esta ruta.",
          415, "El tipo de contenido no está admitido; envía application/json.");

  @ExceptionHandler(ExcepcionReglaDeNegocio.class)
  ResponseEntity<Object> reglaIncumplida(
      ExcepcionReglaDeNegocio error, HttpServletRequest peticion) {
    HttpStatus estado = ESTADO_POR_CODIGO.getOrDefault(error.codigo(), HttpStatus.BAD_REQUEST);
    return responder(estado, error.codigo(), error.getMessage(), peticion.getRequestURI());
  }

  @ExceptionHandler(RecursoNoEncontradoExcepcion.class)
  ResponseEntity<Object> noEncontrado(
      RecursoNoEncontradoExcepcion error, HttpServletRequest peticion) {
    return responder(
        HttpStatus.NOT_FOUND, error.codigo(), error.getMessage(), peticion.getRequestURI());
  }

  @ExceptionHandler(AccesoDenegadoExcepcion.class)
  ResponseEntity<Object> accesoDenegado(
      AccesoDenegadoExcepcion error, HttpServletRequest peticion) {
    return responder(
        HttpStatus.FORBIDDEN, "acceso-denegado", error.getMessage(), peticion.getRequestURI());
  }

  @ExceptionHandler(NoAutenticadoExcepcion.class)
  ResponseEntity<Object> noAutenticado(NoAutenticadoExcepcion error, HttpServletRequest peticion) {
    return responder(
        HttpStatus.UNAUTHORIZED, "no-autenticado", error.getMessage(), peticion.getRequestURI());
  }

  /** Lo inesperado: el detalle es genérico y el error completo queda en el log. */
  @ExceptionHandler(Exception.class)
  ResponseEntity<Object> inesperado(Exception error, HttpServletRequest peticion) {
    LOG.error("Error inesperado en {} {}", peticion.getMethod(), peticion.getRequestURI(), error);
    return responder(
        HttpStatus.INTERNAL_SERVER_ERROR,
        null,
        "Ocurrió un error inesperado. Intenta de nuevo más tarde.",
        peticion.getRequestURI());
  }

  /** El cuerpo JSON no pasó la validación de forma ({@code @Valid}). */
  @Override
  protected ResponseEntity<Object> handleMethodArgumentNotValid(
      MethodArgumentNotValidException error,
      HttpHeaders cabeceras,
      HttpStatusCode estado,
      WebRequest peticion) {
    List<ErrorDeCampo> errores =
        error.getBindingResult().getFieldErrors().stream()
            .map(campo -> new ErrorDeCampo(campo.getField(), campo.getDefaultMessage()))
            .toList();
    return responderValidacion(errores, peticion);
  }

  /** Un parámetro de la URL no pasó su validación ({@code @Min}, {@code @Max}). */
  @Override
  protected ResponseEntity<Object> handleHandlerMethodValidationException(
      HandlerMethodValidationException error,
      HttpHeaders cabeceras,
      HttpStatusCode estado,
      WebRequest peticion) {
    List<ErrorDeCampo> errores =
        error.getParameterValidationResults().stream()
            .flatMap(resultado ->
                resultado.getResolvableErrors().stream()
                    .map(fallo ->
                        new ErrorDeCampo(
                            resultado.getMethodParameter().getParameterName(),
                            fallo.getDefaultMessage())))
            .toList();
    return responderValidacion(errores, peticion);
  }

  /** Falta un parámetro obligatorio de la URL, como {@code idCampana}. */
  @Override
  protected ResponseEntity<Object> handleMissingServletRequestParameter(
      MissingServletRequestParameterException error,
      HttpHeaders cabeceras,
      HttpStatusCode estado,
      WebRequest peticion) {
    return responderValidacion(
        List.of(new ErrorDeCampo(error.getParameterName(), "Este parámetro es obligatorio.")),
        peticion);
  }

  /** Un parámetro de la URL no tiene el tipo esperado, por ejemplo un id que no es un UUID. */
  @Override
  protected ResponseEntity<Object> handleTypeMismatch(
      TypeMismatchException error,
      HttpHeaders cabeceras,
      HttpStatusCode estado,
      WebRequest peticion) {
    String campo =
        error instanceof MethodArgumentTypeMismatchException deMetodo
            ? deMetodo.getName()
            : error.getPropertyName();
    return responderValidacion(
        List.of(new ErrorDeCampo(campo, "El valor no tiene el formato esperado.")), peticion);
  }

  /** El resto de los errores de Spring MVC: mismo estado, pero con el texto en español. */
  @Override
  protected ResponseEntity<Object> handleExceptionInternal(
      Exception error,
      Object cuerpo,
      HttpHeaders cabeceras,
      HttpStatusCode estado,
      WebRequest peticion) {
    String detalle =
        DETALLE_POR_ESTADO.getOrDefault(estado.value(), "No se pudo atender la petición.");
    ProblemDetail problema = Problemas.crear(estado, null, detalle, rutaDe(peticion));
    return ResponseEntity.status(estado)
        .headers(cabeceras)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problema);
  }

  private ResponseEntity<Object> responderValidacion(
      List<ErrorDeCampo> errores, WebRequest peticion) {
    ProblemDetail problema =
        Problemas.crear(HttpStatus.BAD_REQUEST, VALIDACION, DETALLE_VALIDACION, rutaDe(peticion));
    problema.setProperty("errores", errores);
    return ResponseEntity.badRequest()
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(problema);
  }

  private static ResponseEntity<Object> responder(
      HttpStatus estado, String codigo, String detalle, String ruta) {
    return ResponseEntity.status(estado)
        .contentType(MediaType.APPLICATION_PROBLEM_JSON)
        .body(Problemas.crear(estado, codigo, detalle, ruta));
  }

  private static String rutaDe(WebRequest peticion) {
    return ((ServletWebRequest) peticion).getRequest().getRequestURI();
  }

  /** Un error de un campo, dentro de la extensión {@code errores} de un {@code 400 validacion}. */
  record ErrorDeCampo(String campo, String mensaje) {}
}
