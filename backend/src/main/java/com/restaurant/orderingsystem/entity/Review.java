package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "reviews", uniqueConstraints = @UniqueConstraint(columnNames = {"order_id", "menu_item_id"})) @Getter @Setter
public class Review {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "order_id") private Order order;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "menu_item_id") private MenuItem menuItem;
    @Column(nullable = false) private int rating;
    @Column(name = "comment", length = 500) private String comment;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
