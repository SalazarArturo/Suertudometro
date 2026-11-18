package com.crowdfunding.campaign.api.controller;

import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class SaludControlador {

  @GetMapping("/salud")
  public ResponseEntity<Map<String, String>> salud() {
    return ResponseEntity.ok(Map.of("estado", "ACTIVO", "servicio", "campaign-service"));
  }
}
