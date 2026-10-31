package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "orders") @Getter @Setter
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "table_id") private RestaurantTable table;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "staff_id") private User staff;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "voucher_id") private Voucher voucher;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private OrderStatus status = OrderStatus.PENDING;
    @Column(length = 255) private String note;
    @Column(name = "total_amount", nullable = false, precision = 12, scale = 2) private BigDecimal totalAmount = BigDecimal.ZERO;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("id") private List<OrderItem> items = new ArrayList<>();
    @PrePersist void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}
