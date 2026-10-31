package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "payments") @Getter @Setter
public class Payment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "order_id") private Order order;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private PaymentMethod method;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal amount;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private PaymentStatus status = PaymentStatus.PENDING;
    @Column(name = "paid_at") private LocalDateTime paidAt;
}
