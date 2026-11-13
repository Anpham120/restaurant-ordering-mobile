package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/** A message a customer sends to the store from the app, and the store's reply (answered = reply present). */
@Entity @Table(name = "feedback") @Getter @Setter
public class Feedback {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(optional = false, fetch = FetchType.LAZY) @JoinColumn(name = "customer_id") private User customer;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "order_id") private Order order;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private FeedbackTopic topic;
    @Column(nullable = false, length = 1000) private String message;
    @Column(length = 1000) private String reply;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "replied_by") private User repliedBy;
    @Column(name = "replied_at") private LocalDateTime repliedAt;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { if (createdAt == null) createdAt = LocalDateTime.now(); }
}
