package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.repository.UserRepository;
import com.restaurant.orderingsystem.security.AuthUser;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;

/**
 * The single place where an order changes status: writes the history row, applies the payment side effects
 * (cash collected on delivery, refund needed when a paid order is cancelled) and notifies the customer.
 */
@Component
@RequiredArgsConstructor
public class OrderEvents {
    private final UserRepository users;
    private final NotificationService notifications;

    /** @param byUserId who made the change; null = the current caller, or the system when there is none */
    void change(Order o, OrderStatus to, String note, Long byUserId) {
        Long by = byUserId != null ? byUserId : Caller.user().map(AuthUser::id).orElse(null);
        User actor = by == null ? null : users.getReferenceById(by);
        o.setStatus(to);
        record(o, to, note, actor);
        Payment p = o.getPayment();
        if (p != null) {
            if (to == OrderStatus.DELIVERED) PaymentService.collectCod(p, actor);
            if (to == OrderStatus.CANCELLED) PaymentService.onCancel(p);
        }
        boolean byCustomer = actor != null && o.getCustomer().getId().equals(by);
        if (!byCustomer) notifications.orderStatus(o, to, note);
    }

    static void record(Order o, OrderStatus status, String note, User actor) {
        OrderStatusHistory h = new OrderStatusHistory();
        h.setOrder(o);
        h.setStatus(status);
        h.setChangedBy(actor);
        h.setNote(note);
        h.setChangedAt(LocalDateTime.now());
        o.getHistory().add(h);
    }
}
