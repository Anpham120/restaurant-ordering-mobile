package com.restaurant.orderingsystem.controller;

import com.restaurant.orderingsystem.dto.Dtos.SepayWebhook;
import com.restaurant.orderingsystem.service.PaymentService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/** SePay calls this for every transfer to the restaurant's bank account (header "Authorization: Apikey <key>"). */
@RestController
@RequiredArgsConstructor
public class PaymentWebhookController {
    private final PaymentService payments;

    @PostMapping("/api/payments/sepay/webhook")
    public Map<String, Boolean> sepay(@RequestHeader(value = "Authorization", required = false) String authorization, @RequestBody SepayWebhook body) {
        payments.sepayWebhook(authorization, body);
        return Map.of("success", true);
    }
}
