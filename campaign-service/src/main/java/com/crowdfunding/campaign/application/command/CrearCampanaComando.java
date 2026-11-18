package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import com.crowdfunding.campaign.application.dto.DetalleCampanaDto;
import java.time.Instant;
import java.util.UUID;

// esta clase son los papelitos que manda el mesero a la cocina para que la atienda el cocinero
// especializado en preparar
// DetalleCompanaDto

// lo mismo para los demas papelitos que son comandos sueltos
public record CrearCampanaComando(
    UUID idOrganizador,
    String titulo,
    String historia,
    String categoria,
    String metaFinanciera,
    String moneda,
    Instant fechaLimite)
    implements Command<
        DetalleCampanaDto> {} // lo que esta envuelto En la interfaz es la respuesta que dara este
                              // caso de uso
