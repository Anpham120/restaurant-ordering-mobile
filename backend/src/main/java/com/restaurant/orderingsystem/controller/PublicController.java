package com.restaurant.orderingsystem.controller;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.security.Caller;
import com.restaurant.orderingsystem.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/** Everything a visitor can see without logging in. */
@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class PublicController {
    private final StoreService store;
    private final ZoneService zones;
    private final CatalogService catalog;
    private final VoucherService vouchers;

    @GetMapping("/store") public StoreResponse store() { return store.info(); }
    @GetMapping("/zones") public List<ZoneResponse> zones() { return zones.list(false); }
    @GetMapping("/categories") public List<CategoryResponse> categories() { return catalog.categories(false); }
    @GetMapping("/vouchers") public List<VoucherResponse> vouchers() { return vouchers.usable(); }

    @GetMapping("/menu")
    public List<MenuItemResponse> menu(@RequestParam(required = false) Long categoryId, @RequestParam(required = false) String q) {
        return catalog.menu(categoryId, q, false);
    }

    @GetMapping("/menu/popular")
    public List<MenuItemResponse> popular(@RequestParam(defaultValue = "6") int limit) { return catalog.popular(limit); }

    @GetMapping("/menu/{id}")
    public MenuItemDetail item(@PathVariable Long id) { return catalog.detail(id); }
}
