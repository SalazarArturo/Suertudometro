package com.crowdfunding.campaign.domain.model;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

public final class EntradaHistorialEstado {

  private final UUID id;
  private final EstadoCampana estadoAnterior;
  private final EstadoCampana estadoNuevo;
  private final UUID idActor;
  private final String motivo;
  private final Instant fechaTransicion;

  public EntradaHistorialEstado(
      UUID id,
      EstadoCampana estadoAnterior,
      EstadoCampana estadoNuevo,
      UUID idActor,
      String motivo,
      Instant fechaTransicion) {
    this.id = Objects.requireNonNull(id, "El id del historial es obligatorio");
    this.estadoAnterior = estadoAnterior;
    this.estadoNuevo = Objects.requireNonNull(estadoNuevo, "El estado nuevo es obligatorio");
    this.idActor = idActor;
    this.motivo = Objects.requireNonNull(motivo, "El motivo de transicion es obligatorio").trim();
    this.fechaTransicion =
        Objects.requireNonNull(fechaTransicion, "La fecha de transicion es obligatoria");
  }

  public static EntradaHistorialEstado registrar(
      EstadoCampana estadoAnterior,
      EstadoCampana estadoNuevo,
      UUID idActor,
      String motivo,
      Instant fechaTransicion) {
    return new EntradaHistorialEstado(
        UUID.randomUUID(), estadoAnterior, estadoNuevo, idActor, motivo, fechaTransicion);
  }

  public UUID obtenerId() {
    return id;
  }

  public EstadoCampana obtenerEstadoAnterior() {
    return estadoAnterior;
  }

  public EstadoCampana obtenerEstadoNuevo() {
    return estadoNuevo;
  }

  public UUID obtenerIdActor() {
    return idActor;
  }

  public String obtenerMotivo() {
    return motivo;
  }

  public Instant obtenerFechaTransicion() {
    return fechaTransicion;
  }
}
