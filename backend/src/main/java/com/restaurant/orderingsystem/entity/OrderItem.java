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

@Entity @Table(name = "order_items") @Getter @Setter
public class OrderItem {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "order_id") private Order order;
    @ManyToOne(optional = false) @JoinColumn(name = "menu_item_id") private MenuItem menuItem;
    @Column(nullable = false) private int quantity;
    /** Price charged when the order was placed. */
    @Column(name = "unit_price", nullable = false, precision = 12, scale = 2) private BigDecimal unitPrice;
    @Column(length = 200) private String note;
    @OneToMany(mappedBy = "orderItem", cascade = CascadeType.ALL) private List<OrderItemOption> options = new ArrayList<>();
}
