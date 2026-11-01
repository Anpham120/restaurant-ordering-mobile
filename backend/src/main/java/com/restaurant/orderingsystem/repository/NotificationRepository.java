package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    @Query("select n from Notification n where n.user.id = :userId order by n.createdAt desc, n.id desc")
    List<Notification> findForUser(@Param("userId") Long userId, Pageable page);
    long countByUserIdAndReadFalse(Long userId);
    Optional<Notification> findByIdAndUserId(Long id, Long userId);
    boolean existsByPromotionId(Long promotionId);
    @Modifying @Query("update Notification n set n.promotion = null where n.promotion.id = :id")
    int unlinkPromotion(@Param("id") Long promotionId);
    @Modifying @Query("update Notification n set n.read = true where n.user.id = :userId and n.read = false")
    int markAllRead(@Param("userId") Long userId);
    @Modifying @Query(value = "insert into notifications (user_id, type, title, body, promotion_id, is_read, created_at) " +
            "select u.id, 'PROMOTION', :title, :body, :promotionId, false, now() from users u where u.role = 'CUSTOMER' and u.is_active", nativeQuery = true)
    int broadcastPromotion(@Param("title") String title, @Param("body") String body, @Param("promotionId") Long promotionId);
}
