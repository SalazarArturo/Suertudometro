package com.crowdfunding.contribution.api.dto;

import java.util.UUID;

/** Respuesta de {@code POST /api/aportes}: el id del aporte que se acaba de registrar. */
public record AporteCreadoRespuesta(UUID idAporte) {}
