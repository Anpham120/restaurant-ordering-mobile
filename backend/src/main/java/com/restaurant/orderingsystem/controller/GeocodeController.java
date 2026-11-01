package com.restaurant.orderingsystem.controller;

import com.restaurant.orderingsystem.dto.Dtos.GeoPlace;
import com.restaurant.orderingsystem.service.GeocodeService;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

/** Address search for any signed-in user (customers pick a delivery position, the manager sets the restaurant's). */
@RestController
@RequestMapping("/api/geocode")
@RequiredArgsConstructor
public class GeocodeController {
    private final GeocodeService geocode;

    @GetMapping("/search") public List<GeoPlace> search(@RequestParam("q") String q) { return geocode.search(q); }

    @GetMapping("/reverse")
    public List<GeoPlace> reverse(@RequestParam("lat") @NotNull @DecimalMin("-90") @DecimalMax("90") BigDecimal lat,
                                  @RequestParam("lng") @NotNull @DecimalMin("-180") @DecimalMax("180") BigDecimal lng) {
        return geocode.reverse(lat, lng);
    }
}
