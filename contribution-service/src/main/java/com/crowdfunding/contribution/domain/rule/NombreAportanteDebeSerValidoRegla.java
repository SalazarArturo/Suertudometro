package com.crowdfunding.contribution.domain.rule;

import com.crowdfunding.contribution.domain.valueobject.NombreAportante;
import com.crowdfunding.contribution.sharedkernel.ReglaDeNegocio;

/** El nombre del aportante no está vacío y cabe en la columna {@code nombre_aportante}. */
public record NombreAportanteDebeSerValidoRegla(String nombre) implements ReglaDeNegocio {

  @Override
  public boolean seCumple() {
    return nombre != null
        && !nombre.isBlank()
        && nombre.trim().codePointCount(0, nombre.trim().length()) <= NombreAportante.LARGO_MAXIMO;
  }

  @Override
  public String codigo() {
    return "nombre-aportante-invalido";
  }

  @Override
  public String mensaje() {
    return "El nombre del aportante es obligatorio y tiene como máximo "
        + NombreAportante.LARGO_MAXIMO
        + " caracteres.";
  }
}
