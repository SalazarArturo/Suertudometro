package com.crowdfunding.contribution.sharedkernel;

/**
 * Una regla (invariante) del dominio, declarada como un objeto para poder leerla y probarla por
 * separado, como en el repositorio del docente.
 */
public interface ReglaDeNegocio {

  /** Verdadero si los datos cumplen la regla. */
  boolean seCumple();

  /** Código del error, en ASCII y kebab-case. Es el final del {@code type} del error RFC 9457. */
  String codigo();

  /** Explicación para la persona que incumplió la regla. */
  String mensaje();

  /** Lanza {@link ExcepcionReglaDeNegocio} si la regla no se cumple. */
  static void verificar(ReglaDeNegocio regla) {
    if (!regla.seCumple()) {
      throw new ExcepcionReglaDeNegocio(regla.codigo(), regla.mensaje());
    }
  }
}
