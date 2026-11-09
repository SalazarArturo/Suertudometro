package com.crowdfunding.gateway;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/** Punto de entrada único de Suertudómetro (docs/servicios/api-gateway.md). */
@SpringBootApplication
@ConfigurationPropertiesScan
public class ApiGatewayApplication {

  public static void main(String[] args) {
    SpringApplication.run(ApiGatewayApplication.class, args);
  }
}
