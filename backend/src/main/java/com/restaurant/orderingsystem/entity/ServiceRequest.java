package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "service_requests") @Getter @Setter
public class ServiceRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "table_id") private RestaurantTable table;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private RequestType type;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private RequestStatus status = RequestStatus.OPEN;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
