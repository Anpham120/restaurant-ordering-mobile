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
    boolean existsByCustomerId(Long customerId);
    List<Order> findByStatusInOrderByCreatedAtAsc(Collection<OrderStatus> statuses);
    List<Order> findByStatusAndShipperIdOrderByUpdatedAtAsc(OrderStatus status, Long shipperId);
    boolean existsByShipperId(Long shipperId);
    @Query("select o from Order o where o.shipper.id = :shipperId and o.status in :statuses and o.updatedAt >= :since order by o.updatedAt desc")
    List<Order> findFinishedByShipperSince(@Param("shipperId") Long shipperId, @Param("statuses") Collection<OrderStatus> statuses, @Param("since") LocalDateTime since);
    @Query("select distinct h.order from OrderStatusHistory h where h.status = :status and h.changedAt >= :from and h.changedAt < :to")
    List<Order> findReachedStatusBetween(@Param("status") OrderStatus status, @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
