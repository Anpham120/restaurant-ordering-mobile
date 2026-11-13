package com.restaurant.orderingsystem.controller;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/** Liveness probe used by the Docker healthcheck and scripts/deploy.sh. */
@RestController
public class HealthController {
    @GetMapping("/api/health")
    public Map<String, String> health() { return Map.of("status", "UP", "service", "Atlas Restaurant API"); }
}
