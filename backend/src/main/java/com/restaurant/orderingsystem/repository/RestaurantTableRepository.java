package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.time.LocalDateTime;
import java.util.*;

public interface RestaurantTableRepository extends JpaRepository<RestaurantTable, Long> {
    Optional<RestaurantTable> findByQrToken(String qrToken);
}
