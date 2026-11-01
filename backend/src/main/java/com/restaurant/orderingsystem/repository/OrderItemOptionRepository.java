package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface OrderItemOptionRepository extends JpaRepository<OrderItemOption, OrderItemOptionKey> {
    boolean existsByOptionId(Long optionId);
    @Query("select count(o) > 0 from OrderItemOption o where o.option.group.id = :groupId")
    boolean existsByGroupId(@Param("groupId") Long groupId);
}
