package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class FavoriteService {
    private final FavoriteRepository favorites;
    private final UserRepository users;
    private final CatalogService catalog;

    @Transactional(readOnly = true)
    public List<MenuItemResponse> list() {
        CatalogService.Stats st = catalog.stats();
        return favorites.findForUser(Caller.id()).stream().map(f -> CatalogService.toResponse(f.getMenuItem(), st)).toList();
    }

    @Transactional
    public void add(Long menuItemId) {
        MenuItem m = catalog.item(menuItemId);
        if (!m.isActive()) throw ApiException.badRequest("Món không còn trong thực đơn");
        UserMenuItemKey key = new UserMenuItemKey(Caller.id(), menuItemId);
        if (favorites.existsById(key)) return;
        Favorite f = new Favorite();
        f.setId(key);
        f.setUser(users.getReferenceById(Caller.id()));
        f.setMenuItem(m);
        favorites.save(f);
    }

    @Transactional
    public void remove(Long menuItemId) { favorites.deleteById(new UserMenuItemKey(Caller.id(), menuItemId)); }
}
