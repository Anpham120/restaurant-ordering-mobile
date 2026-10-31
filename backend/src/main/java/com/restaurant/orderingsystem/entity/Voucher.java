package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Entity @Table(name = "vouchers") @Getter @Setter
public class Voucher {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @NotBlank @Column(nullable = false, unique = true, length = 40) private String code;
    @NotNull @Enumerated(EnumType.STRING) @Column(name = "discount_type", nullable = false, length = 20) private DiscountType discountType;
    @NotNull @DecimalMin("0") @Column(name = "discount_value", nullable = false, precision = 12, scale = 2) private BigDecimal discountValue;
    @DecimalMin("0") @Column(name = "min_order", nullable = false, precision = 12, scale = 2) private BigDecimal minOrder = BigDecimal.ZERO;
    @Column(name = "start_at") private LocalDateTime startAt;
    @Column(name = "end_at") private LocalDateTime endAt;
    @Min(0) @Column(name = "usage_limit") private Integer usageLimit;
}
