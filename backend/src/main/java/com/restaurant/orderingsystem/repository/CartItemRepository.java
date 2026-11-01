package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface CartItemRepository extends JpaRepository<CartItem, Long> {
    @Query("select distinct c from CartItem c join fetch c.menuItem m join fetch m.category left join fetch c.options where c.user.id = :userId order by c.id")
    List<CartItem> findForUser(@Param("userId") Long userId);
    Optional<CartItem> findByIdAndUserId(Long id, Long userId);
    long countByUserId(Long userId);
    @Modifying @Query("delete from CartItem c where c.user.id = :userId")
    void clear(@Param("userId") Long userId);
}
