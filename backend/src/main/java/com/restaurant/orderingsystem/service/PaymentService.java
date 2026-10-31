package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.PaymentResponse;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.BadRequestException;
import com.restaurant.orderingsystem.exception.NotFoundException;
import com.restaurant.orderingsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class PaymentService {
    private final PaymentRepository payments;
    private final OrderRepository orders;

    /** Cash waits for staff confirmation; TRANSFER/EWALLET are treated as paid at once (no gateway integrated yet). */
    @Transactional
    public PaymentResponse create(Long orderId, PaymentMethod method) {
        Order order = orders.findById(orderId).orElseThrow(() -> new NotFoundException("Order not found: " + orderId));
        if (!OrderService.OPEN.contains(order.getStatus())) throw new BadRequestException("Order is " + order.getStatus() + ", cannot be paid");
        boolean hasItems = order.getItems().stream().anyMatch(i -> i.getStatus() != OrderItemStatus.CANCELLED);
        if (!hasItems) throw new BadRequestException("Order has no items");
        if (payments.existsByOrderIdAndStatusIn(orderId, List.of(PaymentStatus.PENDING, PaymentStatus.PAID))) {
            throw new BadRequestException("Order already has a pending or completed payment");
        }
        Payment p = new Payment();
        p.setOrder(order);
        p.setMethod(method);
        p.setAmount(order.getTotalAmount());
        if (method != PaymentMethod.CASH) markPaid(p);
        return PaymentResponse.of(payments.save(p));
    }

    @Transactional
    public PaymentResponse confirm(Long paymentId) {
        Payment p = find(paymentId);
        if (p.getStatus() != PaymentStatus.PENDING) throw new BadRequestException("Payment is " + p.getStatus());
        markPaid(p);
        return PaymentResponse.of(p);
    }

    @Transactional
    public PaymentResponse fail(Long paymentId) {
        Payment p = find(paymentId);
        if (p.getStatus() != PaymentStatus.PENDING) throw new BadRequestException("Payment is " + p.getStatus());
        p.setStatus(PaymentStatus.FAILED);
        return PaymentResponse.of(p);
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> byOrder(Long orderId) {
        return payments.findByOrderId(orderId).stream().map(PaymentResponse::of).toList();
    }

    private Payment find(Long id) { return payments.findById(id).orElseThrow(() -> new NotFoundException("Payment not found: " + id)); }

    private void markPaid(Payment p) {
        p.setStatus(PaymentStatus.PAID);
        p.setPaidAt(LocalDateTime.now());
        Order o = p.getOrder();
        o.setStatus(OrderStatus.COMPLETED);
        o.getTable().setStatus(TableStatus.FREE);
    }
}
