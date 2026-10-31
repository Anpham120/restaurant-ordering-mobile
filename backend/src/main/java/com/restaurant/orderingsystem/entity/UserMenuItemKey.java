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

/** Composite key (user, menu item) shared by favorites and cart items. */
@Embeddable @Getter @Setter @NoArgsConstructor
public class UserMenuItemKey implements Serializable {
    @Column(name = "user_id") private Long userId;
    @Column(name = "menu_item_id") private Long menuItemId;
    public UserMenuItemKey(Long userId, Long menuItemId) { this.userId = userId; this.menuItemId = menuItemId; }
    @Override public boolean equals(Object o) { return o instanceof UserMenuItemKey k && java.util.Objects.equals(userId, k.userId) && java.util.Objects.equals(menuItemId, k.menuItemId); }
    @Override public int hashCode() { return java.util.Objects.hash(userId, menuItemId); }
}
