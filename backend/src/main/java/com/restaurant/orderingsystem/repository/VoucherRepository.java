package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface VoucherRepository extends JpaRepository<Voucher, Long> {
    Optional<Voucher> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);
    List<Voucher> findAllByOrderByCreatedAtDesc();
    @Query("select v from Voucher v where v.active = true and (v.startAt is null or v.startAt <= :now) and (v.endAt is null or v.endAt >= :now) order by v.minOrder")
    List<Voucher> findUsable(@Param("now") LocalDateTime now);
}
