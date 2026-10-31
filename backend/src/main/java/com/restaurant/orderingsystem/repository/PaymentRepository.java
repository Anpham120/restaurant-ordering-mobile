package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.*;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    boolean existsByOrderIdAndStatusIn(Long orderId, Collection<PaymentStatus> statuses);
    List<Payment> findByOrderId(Long orderId);
}
