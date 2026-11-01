package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface BankTransactionRepository extends JpaRepository<BankTransaction, Long> {
    boolean existsByProviderAndProviderTxnId(String provider, Long providerTxnId);
    List<BankTransaction> findAllByOrderByReceivedAtDesc(Pageable page);
}
