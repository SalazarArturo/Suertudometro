package com.crowdfunding.campaign.sharedkernel;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public abstract class RaizDeAgregado {

  private final List<EventoDeDominio> eventosDeDominio = new ArrayList<>();

  protected void registrarEvento(EventoDeDominio evento) {
    if (evento != null) {
      this.eventosDeDominio.add(evento);
    }
  }

  public List<EventoDeDominio> extraerEventos() {
    // lo que retornamos es otra referencia no la property original es mas la vaciamos la property
    // antes de
    // retornar la copia
    List<EventoDeDominio> copia = List.copyOf(this.eventosDeDominio);
    this.eventosDeDominio.clear();
    return copia;
  }

  public List<EventoDeDominio> obtenerEventos() {
    // un readonly ?
    return Collections.unmodifiableList(this.eventosDeDominio);
  }

  protected static void verificarRegla(ReglaDeNegocio regla) {

    if (regla.esInvalida()) {
      throw new ExcepcionReglaDeNegocio(regla);
    }
  }
}
