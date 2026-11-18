package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import an.awesome.pipelinr.Voidy;
import java.time.Instant;
import java.util.UUID;

public record RegistrarAporteEnCampanaComando(
    UUID idCampana, String monto, String moneda, Instant fechaAporte) implements Command<Voidy> {}
