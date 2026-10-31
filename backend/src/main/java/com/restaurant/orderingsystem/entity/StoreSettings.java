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

/** Single row (id = 1). */
@Entity @Table(name = "store_settings") @Getter @Setter
public class StoreSettings {
    public static final short ID = 1;
    @Id private Short id = ID;
    @Column(name = "store_name", nullable = false, length = 100) private String storeName;
    @Column(nullable = false, length = 15) private String hotline;
    @Column(name = "store_address", nullable = false, length = 200) private String storeAddress;
    @Column(name = "open_time", nullable = false) private LocalTime openTime;
    @Column(name = "close_time", nullable = false) private LocalTime closeTime;
    @Column(name = "min_order_amount", nullable = false, precision = 12, scale = 2) private BigDecimal minOrderAmount = BigDecimal.ZERO;
    @Column(name = "is_accepting_orders", nullable = false) private boolean acceptingOrders = true;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "updated_by") private User updatedBy;
    @PrePersist @PreUpdate void touch() { updatedAt = LocalDateTime.now(); }
}
