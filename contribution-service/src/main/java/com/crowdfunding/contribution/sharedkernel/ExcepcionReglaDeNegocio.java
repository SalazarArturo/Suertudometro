package com.crowdfunding.contribution.sharedkernel;

/** Los datos incumplen una regla del dominio. La capa api la convierte en un error RFC 9457. */
public class ExcepcionReglaDeNegocio extends RuntimeException {

  private final String codigo;

  public ExcepcionReglaDeNegocio(String codigo, String mensaje) {
    super(mensaje);
    this.codigo = codigo;
  }

  /** Código de la regla incumplida, por ejemplo {@code campana-no-acepta-aportes}. */
  public String codigo() {
    return codigo;
  }
}
