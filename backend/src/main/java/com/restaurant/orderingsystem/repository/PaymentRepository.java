package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    List<Payment> findByStatusOrderByCreatedAtDesc(PaymentStatus status);
    @Query("select p from Payment p join fetch p.order o where p.method = :method and p.status = :status and p.expiresAt < :now")
    List<Payment> findExpired(@Param("method") PaymentMethod method, @Param("status") PaymentStatus status, @Param("now") LocalDateTime now);
    long countByStatus(PaymentStatus status);
    boolean existsByConfirmedById(Long userId);
}
