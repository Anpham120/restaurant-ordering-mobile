package com.restaurant.orderingsystem.controller;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.service.ShipperService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

/** Shipper app (role SHIPPER, see AuthInterceptor): claim ready orders, confirm delivery with a photo, report failures. */
@RestController @RequestMapping("/api/shipper") @RequiredArgsConstructor
public class ShipperController {
    private final ShipperService shipper;

    @GetMapping("/board") public ShipperBoard board() { return shipper.board(); }
    @GetMapping("/orders/{id}") public OrderResponse order(@PathVariable Long id) { return shipper.get(id); }
    @PostMapping("/orders/{id}/claim") public OrderResponse claim(@PathVariable Long id) { return shipper.claim(id); }
    @PostMapping("/orders/{id}/deliver") public OrderResponse deliver(@PathVariable Long id, @Valid @RequestBody DeliverRequest r) { return shipper.deliver(id, r); }
    @PostMapping("/orders/{id}/fail") public OrderResponse fail(@PathVariable Long id, @Valid @RequestBody FailRequest r) { return shipper.fail(id, r); }
    @GetMapping("/orders/{id}/delivery-proof") public DeliveryProofResponse proof(@PathVariable Long id) { return shipper.proof(id); }
}
