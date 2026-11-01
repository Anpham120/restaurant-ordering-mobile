package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/** One choice inside an option group, with its extra price. */
@Entity @Table(name = "options") @Getter @Setter
public class MenuOption {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "group_id") private OptionGroup group;
    @Column(nullable = false, length = 60) private String name;
    @Column(name = "price_delta", nullable = false, precision = 12, scale = 2) private BigDecimal priceDelta = BigDecimal.ZERO;
    @Column(name = "is_available", nullable = false) private boolean available = true;
    @Column(name = "sort_order", nullable = false) private int sortOrder;
}
