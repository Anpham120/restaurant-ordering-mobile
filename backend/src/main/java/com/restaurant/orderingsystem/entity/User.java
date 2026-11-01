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

@Entity @Table(name = "users") @Getter @Setter
public class User {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(name = "full_name", nullable = false, length = 100) private String fullName;
    @Column(nullable = false, unique = true, length = 15) private String phone;
    @Column(unique = true, length = 120) private String email;
    @Column(name = "password_hash", nullable = false, length = 100) private String passwordHash;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 20) private Role role;
    @Column(name = "is_active", nullable = false) private boolean active = true;
    /** Carried by every JWT; incremented on password change/reset so older sessions stop working. */
    @Column(name = "token_version", nullable = false) private int tokenVersion;
    @Column(name = "must_change_password", nullable = false) private boolean mustChangePassword;
    /** Accepts promotional notifications (order and payment notifications are always sent). */
    @Column(name = "marketing_opt_in", nullable = false) private boolean marketingOptIn = true;
    @Column(name = "created_at", nullable = false, updatable = false) private LocalDateTime createdAt;
    @PrePersist void onCreate() { createdAt = LocalDateTime.now(); }
}
