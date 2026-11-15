package com.crowdfunding.contribution.infrastructure.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Nombres de la topología de RabbitMQ que usa este servicio (prefijo {@code
 * suertudometro.mensajeria} en application.yml). Están en la configuración para poder cambiarlos
 * sin tocar el código cuando el equipo cierre la topología común.
 *
 * @param exchange exchange topic del sistema, donde se publican y de donde se leen los eventos
 * @param exchangeErrores exchange al que RabbitMQ manda los mensajes rechazados
 * @param cola cola de este servicio para los eventos de campañas
 * @param colaErrores cola de errores (DLQ) de este servicio
 */
@ConfigurationProperties("suertudometro.mensajeria")
public record PropiedadesMensajeria(
    String exchange, String exchangeErrores, String cola, String colaErrores) {}
