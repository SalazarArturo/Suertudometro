package com.crowdfunding.contribution.sharedkernel;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;

/**
 * Base de las raíces de agregado: tienen identidad y acumulan los eventos de dominio que producen,
 * para que la capa de aplicación los publique después de guardar.
 *
 * @param <I> el tipo del identificador
 */
public abstract class RaizDeAgregado<I> {

  private final I id;
  private final List<EventoDeDominio> eventosDeDominio = new ArrayList<>();

  protected RaizDeAgregado(I id) {
    this.id = Objects.requireNonNull(id, "El agregado necesita un id");
  }

  public I id() {
    return id;
  }

  /** Los eventos producidos desde la última limpieza, en el orden en que ocurrieron. */
  public List<EventoDeDominio> eventosDeDominio() {
    return List.copyOf(eventosDeDominio);
  }

  /** Se llama después de publicar los eventos, para no publicarlos dos veces. */
  public void limpiarEventosDeDominio() {
    eventosDeDominio.clear();
  }

  protected void registrarEvento(EventoDeDominio evento) {
    eventosDeDominio.add(evento);
  }

  protected static void verificarRegla(ReglaDeNegocio regla) {
    ReglaDeNegocio.verificar(regla);
  }
}
