package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {
    List<Promotion> findAllByOrderBySortOrderAscIdDesc();
    @Query("select p from Promotion p where p.active = true and (p.startAt is null or p.startAt <= :now) and (p.endAt is null or p.endAt >= :now) order by p.sortOrder, p.id desc")
    List<Promotion> findLive(@Param("now") LocalDateTime now);
    boolean existsByMenuItemId(Long id);
    boolean existsByCategoryId(Long id);
    boolean existsByVoucherId(Long id);
}
