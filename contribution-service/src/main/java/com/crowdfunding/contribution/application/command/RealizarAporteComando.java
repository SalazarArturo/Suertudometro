package com.crowdfunding.contribution.application.command;

import an.awesome.pipelinr.Command;
import java.util.UUID;

/**
 * Registrar un aporte simulado a una campaña publicada. Devuelve el id del aporte creado.
 *
 * @param idAportante el usuario con sesión, tomado del header X-Usuario-Id
 * @param nombreAportante el nombre de la cuenta, tomado del header X-Usuario-Nombre
 * @param monto el monto como texto, por ejemplo {@code "150.00"}
 * @param mensajeApoyo opcional: {@code null} o vacío significa "sin mensaje"
 */
public record RealizarAporteComando(
    UUID idCampana,
    UUID idAportante,
    String nombreAportante,
    String monto,
    String moneda,
    String mensajeApoyo,
    boolean esAnonimo)
    implements Command<UUID> {}
