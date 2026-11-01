package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Embeddable @Getter @Setter @NoArgsConstructor
public class OrderItemOptionKey implements Serializable {
    @Column(name = "order_item_id") private Long orderItemId;
    @Column(name = "option_id") private Long optionId;
    @Override public boolean equals(Object o) { return o instanceof OrderItemOptionKey k && Objects.equals(orderItemId, k.orderItemId) && Objects.equals(optionId, k.optionId); }
    @Override public int hashCode() { return Objects.hash(orderItemId, optionId); }
}
