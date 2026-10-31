package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "restaurant_tables") @Getter @Setter
public class RestaurantTable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, unique = true, length = 20) private String code;
    @Column(nullable = false) private int seats;
    @Column(name = "qr_token", nullable = false, unique = true, length = 64) private String qrToken = UUID.randomUUID().toString();
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private TableStatus status = TableStatus.FREE;
}
