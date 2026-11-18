package com.crowdfunding.campaign.api.exception;

import com.crowdfunding.campaign.application.port.out.ExcepcionRecursoNoEncontrado;
import com.crowdfunding.campaign.sharedkernel.ExcepcionReglaDeNegocio;
import java.net.URI;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ManejadorGlobalExcepciones {

  private static final String BASE_URI_ERRORES = "https://api.suertudometro.com/errores/";

  @ExceptionHandler(IllegalArgumentException.class)
  public ProblemDetail manejarArgumentoInvalido(IllegalArgumentException ex) {
    ProblemDetail problema =
        ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, ex.getMessage());
    problema.setTitle("Datos de campana invalidos");
    problema.setType(URI.create(BASE_URI_ERRORES + "datos-campana-invalidos"));
    return problema;
  }

  @ExceptionHandler(ExcepcionNoAutenticado.class)
  public ProblemDetail manejarNoAutenticado(ExcepcionNoAutenticado ex) {
    ProblemDetail problema =
        ProblemDetail.forStatusAndDetail(HttpStatus.UNAUTHORIZED, ex.getMessage());
    problema.setTitle("No autenticado");
    problema.setType(URI.create(BASE_URI_ERRORES + "no-autenticado"));
    return problema;
  }

  @ExceptionHandler(ExcepcionAccesoDenegado.class)
  public ProblemDetail manejarAccesoDenegado(ExcepcionAccesoDenegado ex) {
    ProblemDetail problema =
        ProblemDetail.forStatusAndDetail(HttpStatus.FORBIDDEN, ex.getMessage());
    problema.setTitle("Acceso denegado");
    problema.setType(URI.create(BASE_URI_ERRORES + "acceso-denegado"));
    return problema;
  }

  @ExceptionHandler(ExcepcionRecursoNoEncontrado.class)
  public ProblemDetail manejarNoEncontrado(ExcepcionRecursoNoEncontrado ex) {
    ProblemDetail problema =
        ProblemDetail.forStatusAndDetail(HttpStatus.NOT_FOUND, ex.getMessage());
    problema.setTitle("Recurso no encontrado");
    problema.setType(URI.create(BASE_URI_ERRORES + ex.obtenerCodigo()));
    return problema;
  }

  @ExceptionHandler(ExcepcionReglaDeNegocio.class)
  public ProblemDetail manejarReglaDeNegocio(ExcepcionReglaDeNegocio ex) {
    boolean esFaltaDePermiso = "organizador-no-autorizado".equals(ex.obtenerCodigo());
    HttpStatus estadoHttp = esFaltaDePermiso ? HttpStatus.FORBIDDEN : HttpStatus.CONFLICT;
    String titulo = esFaltaDePermiso ? "Acceso denegado" : "Regla de negocio incumplida";

    ProblemDetail problema = ProblemDetail.forStatusAndDetail(estadoHttp, ex.getMessage());
    problema.setTitle(titulo);
    problema.setType(URI.create(BASE_URI_ERRORES + ex.obtenerCodigo()));
    return problema;
  }
}
