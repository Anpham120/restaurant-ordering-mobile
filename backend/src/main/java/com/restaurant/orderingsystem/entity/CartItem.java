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

@Entity @Table(name = "cart_items") @Getter @Setter
public class CartItem {
    @EmbeddedId private UserMenuItemKey id;
    @MapsId("userId") @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @MapsId("menuItemId") @ManyToOne @JoinColumn(name = "menu_item_id") private MenuItem menuItem;
    @Column(nullable = false) private int quantity;
    @Column(length = 200) private String note;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @PrePersist @PreUpdate void touch() { updatedAt = LocalDateTime.now(); }
}
