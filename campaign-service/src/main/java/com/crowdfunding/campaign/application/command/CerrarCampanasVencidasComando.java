package com.crowdfunding.campaign.application.command;

import an.awesome.pipelinr.Command;
import java.time.Instant;

public record CerrarCampanasVencidasComando(Instant momentoActual) implements Command<Integer> {}
