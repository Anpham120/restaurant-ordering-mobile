package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/** One cart line: a dish with a set of options. The same dish may appear twice with different options. */
@Entity @Table(name = "cart_items") @Getter @Setter
public class CartItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "user_id") private User user;
    @ManyToOne(optional = false) @JoinColumn(name = "menu_item_id") private MenuItem menuItem;
    @Column(nullable = false) private int quantity;
    @Column(length = 200) private String note;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;
    @ManyToMany
    @JoinTable(name = "cart_item_options", joinColumns = @JoinColumn(name = "cart_item_id"), inverseJoinColumns = @JoinColumn(name = "option_id"))
    private Set<MenuOption> options = new HashSet<>();
    @PrePersist @PreUpdate void touch() { updatedAt = LocalDateTime.now(); }
}
