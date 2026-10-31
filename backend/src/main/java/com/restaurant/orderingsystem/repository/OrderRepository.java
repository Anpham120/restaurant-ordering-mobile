package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface OrderRepository extends JpaRepository<Order, Long>, JpaSpecificationExecutor<Order> {
    long countByVoucherIdAndStatusNot(Long voucherId, OrderStatus status);
    long countByVoucherIdAndCustomerIdAndStatusNot(Long voucherId, Long customerId, OrderStatus status);
    long countByStatusIn(Collection<OrderStatus> statuses);
    long countByCustomerId(Long customerId);
    boolean existsByVoucherId(Long voucherId);
    boolean existsByZoneId(Long zoneId);
    boolean existsByCustomerId(Long customerId);
    List<Order> findByStatusInOrderByCreatedAtAsc(Collection<OrderStatus> statuses);
    @Query("select distinct h.order from OrderStatusHistory h where h.status = :status and h.changedAt >= :from and h.changedAt < :to")
    List<Order> findReachedStatusBetween(@Param("status") OrderStatus status, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
