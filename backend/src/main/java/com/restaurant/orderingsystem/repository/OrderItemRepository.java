package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    boolean existsByMenuItemId(Long menuItemId);
    @Query("select i.menuItem.id, sum(i.quantity) from OrderItem i where i.order.status = :delivered group by i.menuItem.id")
    List<Object[]> soldQuantities(@Param("delivered") OrderStatus delivered);
}
