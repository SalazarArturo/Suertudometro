package com.crowdfunding.campaign.application.dto;

import java.util.List;

public record PaginaResultadoDto<T>(
    List<T> elementos, int pagina, int tamano, long totalElementos, int totalPaginas) {}
