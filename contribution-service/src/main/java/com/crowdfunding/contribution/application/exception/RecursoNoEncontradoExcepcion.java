package com.crowdfunding.contribution.application.exception;

/** Lo que se pidió no existe para este servicio. La capa api responde 404. */
public class RecursoNoEncontradoExcepcion extends RuntimeException {

  public static final String CAMPANA_NO_ENCONTRADA = "campana-no-encontrada";
  public static final String APORTE_NO_ENCONTRADO = "aporte-no-encontrado";

  private final String codigo;

  public RecursoNoEncontradoExcepcion(String codigo, String mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }

  public static RecursoNoEncontradoExcepcion campana() {
    return new RecursoNoEncontradoExcepcion(
        CAMPANA_NO_ENCONTRADA, "La campaña no existe o todavía no está publicada.");
  }

  public static RecursoNoEncontradoExcepcion aporte() {
    return new RecursoNoEncontradoExcepcion(APORTE_NO_ENCONTRADO, "El aporte no existe.");
  }

  /** Código del error, el final del {@code type} RFC 9457. */
  public String codigo() {
    return codigo;
  }
}
