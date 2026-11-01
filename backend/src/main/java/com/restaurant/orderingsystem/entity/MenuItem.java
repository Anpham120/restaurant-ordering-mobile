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

@Entity @Table(name = "menu_items") @Getter @Setter
public class MenuItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false) @JoinColumn(name = "category_id") private Category category;
    @Column(nullable = false, unique = true, length = 120) private String name;
    @Column(length = 500) private String description;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal price;
    @Column(name = "image_url", length = 500) private String imageUrl;
    /** In stock today (kitchen toggles). */
    @Column(name = "is_available", nullable = false) private boolean available = true;
    /** Still on the menu; dishes that were ever ordered are archived instead of deleted. */
    @Column(name = "is_active", nullable = false) private boolean active = true;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @OneToMany(mappedBy = "menuItem", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("sortOrder, id") private List<OptionGroup> optionGroups = new ArrayList<>();
    @PrePersist void onCreate() { createdAt = updatedAt = LocalDateTime.now(); }
    @PreUpdate void onUpdate() { updatedAt = LocalDateTime.now(); }
}
