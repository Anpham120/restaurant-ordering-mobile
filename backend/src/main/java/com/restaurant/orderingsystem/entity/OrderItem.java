package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "order_items") @Getter @Setter
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "order_id") private Order order;
    @ManyToOne(optional = false) @JoinColumn(name = "menu_item_id") private MenuItem menuItem;
    @Column(nullable = false) private int quantity;
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2) private BigDecimal unitPrice;
    @Column(length = 255) private String note;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private OrderItemStatus status = OrderItemStatus.PENDING;
}
