package com.crowdfunding.contribution.domain.rule;

import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;

/**
 * R6, por el lado del aporte con nombre: si el aporte no es anónimo, tiene que haber un nombre que
 * mostrar. El otro lado (un aporte anónimo nunca guarda el nombre) lo garantiza {@code
 * Aporte.registrar}.
 */
public record AporteConNombreDebeTenerNombreAportanteRegla(
    boolean esAnonimo, NombreAportante nombreAportante) implements ReglaDeNegocio {

  @Override
  public boolean seCumple() {
    return esAnonimo || nombreAportante != null;
  }

  @Override
  public String codigo() {
    return "nombre-aportante-invalido";
  }

  @Override
  public String mensaje() {
    return "Un aporte que no es anónimo necesita el nombre del aportante.";
  }
}
