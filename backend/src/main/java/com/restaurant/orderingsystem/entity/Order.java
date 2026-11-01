package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

/** A delivery order. Subtotal and total are derived from the items; see DATABASE.md. */
@Entity @Table(name = "orders") @Getter @Setter
public class Order {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "customer_id") private User customer;
    @ManyToOne(optional = false) @JoinColumn(name = "zone_id") private DeliveryZone zone;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "voucher_id") private Voucher voucher;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private OrderStatus status = OrderStatus.PENDING;
    @Column(name = "recipient_name", nullable = false, length = 100) private String recipientName;
    @Column(name = "recipient_phone", nullable = false, length = 15) private String recipientPhone;
    @Column(name = "delivery_street", nullable = false, length = 200) private String deliveryStreet;
    @Column(name = "delivery_note", length = 200) private String deliveryNote;
    @Column(length = 300) private String note;
    @Column(name = "delivery_fee", nullable = false, precision = 12, scale = 2) private BigDecimal deliveryFee;
    @Column(name = "discount_amount", nullable = false, precision = 12, scale = 2) private BigDecimal discountAmount = BigDecimal.ZERO;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @Version @Column(nullable = false) private long version;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL) @OrderBy("id") private List<OrderItem> items = new ArrayList<>();
    @OneToOne(mappedBy = "order", cascade = CascadeType.ALL) private Payment payment;
    @OneToMany(mappedBy = "order", cascade = CascadeType.ALL) @OrderBy("changedAt, id") private List<OrderStatusHistory> history = new ArrayList<>();
    @PrePersist void onCreate() {
        if (createdAt == null) createdAt = LocalDateTime.now();
        if (updatedAt == null) updatedAt = createdAt;
    }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}
