package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.*;

public interface OrderRepository extends JpaRepository<Order, Long> {
    Optional<Order> findFirstByTableIdAndStatusIn(Long tableId, Collection<OrderStatus> statuses);
    List<Order> findByStatusInOrderByCreatedAtAsc(Collection<OrderStatus> statuses);
    List<Order> findAllByOrderByCreatedAtDesc();
    long countByVoucherIdAndStatusNotAndIdNot(Long voucherId, OrderStatus status, Long orderId);
    List<Order> findByStatusAndUpdatedAtBetween(OrderStatus status, LocalDateTime from, LocalDateTime to);
}
