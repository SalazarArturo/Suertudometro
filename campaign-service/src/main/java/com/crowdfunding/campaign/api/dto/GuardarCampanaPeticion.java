package com.crowdfunding.campaign.api.dto;

import java.time.Instant;

public record GuardarCampanaPeticion(
    String titulo,
    String historia,
    String categoria,
    String metaFinanciera,
    String moneda,
    Instant fechaLimite) {}
