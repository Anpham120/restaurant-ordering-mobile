package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/** A group of choices for a dish, e.g. "Size" (choose exactly 1) or "Topping" (choose up to 3). */
@Entity @Table(name = "option_groups") @Getter @Setter
public class OptionGroup {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "menu_item_id") private MenuItem menuItem;
    @Column(nullable = false, length = 60) private String name;
    @Column(name = "min_select", nullable = false) private int minSelect;
    @Column(name = "max_select", nullable = false) private int maxSelect = 1;
    @Column(name = "sort_order", nullable = false) private int sortOrder;
    @OneToMany(mappedBy = "group", cascade = CascadeType.ALL, orphanRemoval = true) @OrderBy("sortOrder, id") private List<MenuOption> options = new ArrayList<>();
}
