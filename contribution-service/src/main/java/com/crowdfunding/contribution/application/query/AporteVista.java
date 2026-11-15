package com.crowdfunding.contribution.application.query;

import com.crowdfunding.contribution.sharedkernel.Dinero;
import java.time.Instant;
import java.util.UUID;

/**
 * Un aporte como lo devuelven las consultas (modelo de lectura).
 *
 * @param tituloCampana el título de la campaña, tomado de la proyección local
 * @param idAportante dato interno: sirve para comprobar permisos y no sale en las respuestas
 * @param nombreAportante {@code null} si el aporte es anónimo
 * @param mensajeApoyo {@code null} si el aporte no lleva mensaje
 */
public record AporteVista(
    UUID idAporte,
    UUID idCampana,
    String tituloCampana,
    UUID idAportante,
    String nombreAportante,
    boolean esAnonimo,
    Dinero monto,
    String mensajeApoyo,
    Instant registradoEn) {}
