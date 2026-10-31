package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface OrderStatusHistoryRepository extends JpaRepository<OrderStatusHistory, Long> {
    boolean existsByChangedById(Long userId);
    @Query("select h from OrderStatusHistory h where h.order.id in :orderIds and h.status = :status")
    List<OrderStatusHistory> findByOrdersAndStatus(@Param("orderIds") Collection<Long> orderIds, @Param("status") OrderStatus status);
}
