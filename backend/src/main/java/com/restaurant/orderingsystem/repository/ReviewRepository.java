package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByOrderItemId(Long orderItemId);
    @Query("select r.orderItem.id from Review r where r.orderItem.order.id = :orderId")
    Set<Long> reviewedItemIds(@Param("orderId") Long orderId);
    @Query("select r from Review r join fetch r.orderItem i join fetch i.order o join fetch o.customer where i.menuItem.id = :itemId order by r.createdAt desc")
    List<Review> findForMenuItem(@Param("itemId") Long menuItemId, Pageable page);
    @Query("select r from Review r join fetch r.orderItem i join fetch i.menuItem join fetch i.order o join fetch o.customer order by r.createdAt desc")
    List<Review> findLatest(Pageable page);
    @Query("select r.orderItem.menuItem.id, avg(r.rating), count(r) from Review r group by r.orderItem.menuItem.id")
    List<Object[]> ratingByMenuItem();
    @Query("select avg(r.rating), count(r) from Review r where r.createdAt >= :from")
    List<Object[]> ratingSince(@Param("from") LocalDateTime from);
}
