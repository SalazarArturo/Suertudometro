package com.crowdfunding.campaign.application.dto;

import com.crowdfunding.campaign.domain.model.EntradaHistorialEstado;
import java.time.Instant;
import java.util.UUID;

public record HistorialEstadoDto(
    UUID id,
    String estadoAnterior,
    String estadoNuevo,
    UUID idActor,
    String motivo,
    Instant fechaTransicion) {

  public static HistorialEstadoDto desdeDominio(EntradaHistorialEstado entrada) {
    return new HistorialEstadoDto(
        entrada.obtenerId(),
        entrada.obtenerEstadoAnterior() != null ? entrada.obtenerEstadoAnterior().name() : null,
        entrada.obtenerEstadoNuevo().name(),
        entrada.obtenerIdActor(),
        entrada.obtenerMotivo(),
        entrada.obtenerFechaTransicion());
  }
}
