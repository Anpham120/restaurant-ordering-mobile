package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/** An option chosen for an order line, with the extra price charged when the order was placed. */
@Entity @Table(name = "order_item_options") @Getter @Setter
public class OrderItemOption {
    @EmbeddedId private OrderItemOptionKey id = new OrderItemOptionKey();
    @MapsId("orderItemId") @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_item_id") private OrderItem orderItem;
    @MapsId("optionId") @ManyToOne @JoinColumn(name = "option_id") private MenuOption option;
    @Column(name = "price_delta", nullable = false, precision = 12, scale = 2) private BigDecimal priceDelta;
}
