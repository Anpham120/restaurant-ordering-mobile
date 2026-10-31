package com.restaurant.orderingsystem.controller;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.*;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class OrderController {
    private final OrderService orders;
    private final PaymentService payments;

    @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED)
    public OrderResponse create(@Valid @RequestBody CreateOrderRequest req) { return orders.create(req); }

    @GetMapping("/orders")
    public List<OrderResponse> list(@RequestParam(required = false) OrderStatus status) { return orders.list(status); }

    @GetMapping("/orders/{id}")
    public OrderResponse get(@PathVariable Long id) { return orders.get(id); }

    @PostMapping("/orders/{id}/items")
    public OrderResponse addItems(@PathVariable Long id, @Valid @RequestBody AddItemsRequest req) { return orders.addItems(id, req); }

    @PostMapping("/orders/{id}/voucher")
    public OrderResponse voucher(@PathVariable Long id, @Valid @RequestBody VoucherCodeRequest req) { return orders.applyVoucher(id, req.code()); }

    @PatchMapping("/orders/{id}/status")
    public OrderResponse status(@PathVariable Long id, @Valid @RequestBody OrderStatusRequest req) { return orders.updateStatus(id, req); }

    @PatchMapping("/order-items/{id}/status")
    public OrderResponse itemStatus(@PathVariable Long id, @Valid @RequestBody OrderItemStatusRequest req) { return orders.updateItemStatus(id, req.status()); }

    @PostMapping("/orders/{id}/payments") @ResponseStatus(HttpStatus.CREATED)
    public PaymentResponse pay(@PathVariable Long id, @Valid @RequestBody PaymentRequest req) { return payments.create(id, req.method()); }

    @GetMapping("/orders/{id}/payments")
    public List<PaymentResponse> orderPayments(@PathVariable Long id) { return payments.byOrder(id); }

    @PatchMapping("/payments/{id}/confirm")
    public PaymentResponse confirm(@PathVariable Long id) { return payments.confirm(id); }

    @PatchMapping("/payments/{id}/fail")
    public PaymentResponse fail(@PathVariable Long id) { return payments.fail(id); }
}
