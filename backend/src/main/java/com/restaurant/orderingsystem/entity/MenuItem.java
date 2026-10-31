package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "menu_items") @Getter @Setter
public class MenuItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "category_id") private Category category;
    @Column(nullable = false, length = 120) private String name;
    @Column(length = 500) private String description;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal price;
    @Column(name = "image_url") private String imageUrl;
    @Column(name = "is_available", nullable = false) private boolean available = true;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
