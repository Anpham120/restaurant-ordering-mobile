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

@Entity @Table(name = "favorites") @Getter @Setter
public class Favorite {
    @EmbeddedId private UserMenuItemKey id;
    @MapsId("userId") @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @MapsId("menuItemId") @ManyToOne @JoinColumn(name = "menu_item_id") private MenuItem menuItem;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
