package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/** A restaurant campaign shown as a banner in the app, optionally linking to a dish, category or voucher. */
@Entity @Table(name = "promotions") @Getter @Setter
public class Promotion {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 120) private String title;
    @Column(length = 300) private String subtitle;
    @Column(name = "image_url", nullable = false, length = 500) private String imageUrl;
    @Enumerated(EnumType.STRING) @Column(name = "target_type", nullable = false, length = 20) private PromotionTarget targetType = PromotionTarget.NONE;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "menu_item_id") private MenuItem menuItem;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "category_id") private Category category;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "voucher_id") private Voucher voucher;
    @Column(name = "start_at") private LocalDateTime startAt;
    @Column(name = "end_at") private LocalDateTime endAt;
    @Column(name = "sort_order", nullable = false) private int sortOrder;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    /** Announcement requested during quiet hours: sent automatically at this time. */
    @Column(name = "announce_at") private LocalDateTime announceAt;
    @Column(name = "announced_at") private LocalDateTime announcedAt;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
