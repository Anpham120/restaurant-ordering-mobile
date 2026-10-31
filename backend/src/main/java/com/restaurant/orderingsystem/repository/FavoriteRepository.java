package com.restaurant.orderingsystem.repository;

import com.restaurant.orderingsystem.entity.*;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.*;

public interface FavoriteRepository extends JpaRepository<Favorite, UserMenuItemKey> {
    @Query("select f from Favorite f join fetch f.menuItem m join fetch m.category where f.user.id = :userId and m.active = true order by f.createdAt desc")
    List<Favorite> findForUser(@Param("userId") Long userId);
    @Query("select f.menuItem.id from Favorite f where f.user.id = :userId")
    Set<Long> favoriteIds(@Param("userId") Long userId);
}
