package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface AddressRepository extends JpaRepository<Address, Long> {
    List<Address> findByUserIdOrderByDefaultAddressDescCreatedAtDesc(Long userId);
    Optional<Address> findByIdAndUserId(Long id, Long userId);
    long countByUserId(Long userId);
    boolean existsByZoneId(Long zoneId);
    @Modifying @Query("update Address a set a.defaultAddress = false where a.user.id = :userId and a.defaultAddress = true")
    void clearDefault(@Param("userId") Long userId);
}
