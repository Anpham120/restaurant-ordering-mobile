package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.*;

public interface MenuItemRepository extends JpaRepository<MenuItem, Long> {
    @Query("select m from MenuItem m where (:cat is null or m.category.id = :cat) and lower(m.name) like lower(concat('%', :q, '%')) and (:all = true or m.available = true) order by m.category.sortOrder, m.name")
    List<MenuItem> search(@Param("cat") Long categoryId, @Param("q") String q, @Param("all") boolean includeUnavailable);
}
