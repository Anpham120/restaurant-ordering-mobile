package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.*;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {
    @Query("select i.menuItem.id, i.menuItem.name, sum(i.quantity) from OrderItem i where i.order.status = :os and i.status <> :cancelled and i.order.updatedAt between :f and :t group by i.menuItem.id, i.menuItem.name order by sum(i.quantity) desc")
    List<Object[]> topItems(@Param("os") OrderStatus os, @Param("cancelled") OrderItemStatus cancelled, @Param("f") LocalDateTime from, @Param("t") LocalDateTime to, Pageable page);
}
