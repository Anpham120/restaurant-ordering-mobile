package com.restaurant.orderingsystem.controller;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.*;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.*;

@RestController @RequestMapping("/api") @RequiredArgsConstructor
public class MenuController {
    private final MenuItemRepository menuItems;
    private final CategoryRepository categories;
    private final ReviewService reviews;

    @GetMapping("/categories")
    public List<Category> categories() { return categories.findAllByOrderBySortOrderAscNameAsc(); }

    @GetMapping("/menu")
    public List<MenuItem> menu(@RequestParam(required = false) Long category, @RequestParam(defaultValue = "") String q,
                               @RequestParam(defaultValue = "false") boolean includeUnavailable) {
        return menuItems.search(category, q, includeUnavailable);
    }

    @GetMapping("/menu-items/{id}/reviews")
    public List<ReviewResponse> reviews(@PathVariable Long id) { return reviews.forItem(id); }

    /** Kitchen/staff mark a dish sold out or back on. */
    @PatchMapping("/menu-items/{id}/availability")
    @Transactional
    public MenuItem availability(@PathVariable Long id, @RequestParam boolean available) {
        MenuItem m = menuItems.findById(id).orElseThrow(() -> new NotFoundException("Menu item not found: " + id));
        m.setAvailable(available);
        return m;
    }
}
