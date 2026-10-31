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

@Entity @Table(name = "vouchers") @Getter @Setter
public class Voucher {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 40) private String code;
    @Column(length = 200) private String description;
    @Enumerated(EnumType.STRING) @Column(name = "discount_type", nullable = false, length = 10) private DiscountType discountType;
    @Column(name = "discount_value", nullable = false, precision = 12, scale = 2) private BigDecimal discountValue;
    @Column(name = "max_discount", precision = 12, scale = 2) private BigDecimal maxDiscount;
    @Column(name = "min_order", nullable = false, precision = 12, scale = 2) private BigDecimal minOrder = BigDecimal.ZERO;
    @Column(name = "start_at") private LocalDateTime startAt;
    @Column(name = "end_at") private LocalDateTime endAt;
    @Column(name = "usage_limit") private Integer usageLimit;
    @Column(name = "per_user_limit") private Integer perUserLimit;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
