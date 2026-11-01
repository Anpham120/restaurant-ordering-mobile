package com.restaurant.orderingsystem.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

/** An incoming bank transfer reported by SePay (kept even when it matches no order). */
@Entity @Table(name = "bank_transactions") @Getter @Setter
public class BankTransaction {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 20) private String provider;
    @Column(name = "provider_txn_id", nullable = false) private Long providerTxnId;
    @Column(length = 60) private String gateway;
    @Column(name = "account_number", length = 30) private String accountNumber;
    @Column(nullable = false, precision = 14, scale = 2) private BigDecimal amount;
    @Column(length = 500) private String content;
    @Column(name = "reference_code", length = 100) private String referenceCode;
    @Column(name = "transaction_date") private LocalDateTime transactionDate;
    @Column(name = "received_at", nullable = false) private LocalDateTime receivedAt;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "payment_id") private Payment payment;
    @Column(length = 200) private String note;
}
