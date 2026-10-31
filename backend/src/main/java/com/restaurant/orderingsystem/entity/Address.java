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

@Entity @Table(name = "addresses") @Getter @Setter
public class Address {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @ManyToOne(optional = false) @JoinColumn(name = "zone_id") private DeliveryZone zone;
    @Column(nullable = false, length = 40) private String label;
    @Column(name = "recipient_name", nullable = false, length = 100) private String recipientName;
    @Column(name = "recipient_phone", nullable = false, length = 15) private String recipientPhone;
    @Column(nullable = false, length = 200) private String street;
    @Column(length = 200) private String note;
    @Column(name = "is_default", nullable = false) private boolean defaultAddress;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
