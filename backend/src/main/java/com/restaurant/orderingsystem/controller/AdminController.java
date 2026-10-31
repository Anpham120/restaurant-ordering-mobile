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

/** Manager CRUD. NOTE: no authentication yet, see README. */
@RestController @RequestMapping("/api/admin") @RequiredArgsConstructor
public class AdminController {
    private final CategoryRepository categories;
    private final MenuItemRepository menuItems;
    private final RestaurantTableRepository tables;
    private final VoucherRepository vouchers;
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final ReportService reports;

    // ---- categories ----
    @GetMapping("/categories") public List<Category> listCategories() { return categories.findAllByOrderBySortOrderAscNameAsc(); }
    @PostMapping("/categories") @ResponseStatus(HttpStatus.CREATED)
    public Category createCategory(@Valid @RequestBody Category c) { c.setId(null); return categories.save(c); }
    @PutMapping("/categories/{id}") @Transactional
    public Category updateCategory(@PathVariable Long id, @Valid @RequestBody Category in) {
        Category c = categories.findById(id).orElseThrow(() -> new NotFoundException("Category not found: " + id));
        c.setName(in.getName()); c.setSortOrder(in.getSortOrder()); return c;
    }
    @DeleteMapping("/categories/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCategory(@PathVariable Long id) { requireExists(categories, id, "Category"); categories.deleteById(id); categories.flush(); }

    // ---- menu items ----
    @GetMapping("/menu-items") public List<MenuItem> listMenuItems() { return menuItems.search(null, "", true); }
    @PostMapping("/menu-items") @ResponseStatus(HttpStatus.CREATED)
    public MenuItem createMenuItem(@Valid @RequestBody MenuItemRequest r) { return menuItems.save(apply(new MenuItem(), r)); }
    @PutMapping("/menu-items/{id}") @Transactional
    public MenuItem updateMenuItem(@PathVariable Long id, @Valid @RequestBody MenuItemRequest r) {
        return apply(menuItems.findById(id).orElseThrow(() -> new NotFoundException("Menu item not found: " + id)), r);
    }
    @DeleteMapping("/menu-items/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteMenuItem(@PathVariable Long id) { requireExists(menuItems, id, "Menu item"); menuItems.deleteById(id); menuItems.flush(); }

    private MenuItem apply(MenuItem m, MenuItemRequest r) {
        m.setCategory(categories.findById(r.categoryId()).orElseThrow(() -> new NotFoundException("Category not found: " + r.categoryId())));
        m.setName(r.name()); m.setDescription(r.description()); m.setPrice(r.price()); m.setImageUrl(r.imageUrl());
        if (r.available() != null) m.setAvailable(r.available());
        return m;
    }

    // ---- tables ----
    @GetMapping("/tables") public List<RestaurantTable> listTables() { return tables.findAll(); }
    @PostMapping("/tables") @ResponseStatus(HttpStatus.CREATED)
    public RestaurantTable createTable(@Valid @RequestBody TableRequest r) {
        RestaurantTable t = new RestaurantTable(); t.setCode(r.code()); t.setSeats(r.seats()); return tables.save(t);
    }
    @PutMapping("/tables/{id}") @Transactional
    public RestaurantTable updateTable(@PathVariable Long id, @Valid @RequestBody TableRequest r) {
        RestaurantTable t = tables.findById(id).orElseThrow(() -> new NotFoundException("Table not found: " + id));
        t.setCode(r.code()); t.setSeats(r.seats()); return t;
    }
    @PostMapping("/tables/{id}/regenerate-qr") @Transactional
    public RestaurantTable regenerateQr(@PathVariable Long id) {
        RestaurantTable t = tables.findById(id).orElseThrow(() -> new NotFoundException("Table not found: " + id));
        t.setQrToken(UUID.randomUUID().toString()); return t;
    }
    @DeleteMapping("/tables/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTable(@PathVariable Long id) { requireExists(tables, id, "Table"); tables.deleteById(id); tables.flush(); }

    // ---- vouchers ----
    @GetMapping("/vouchers") public List<Voucher> listVouchers() { return vouchers.findAll(); }
    @PostMapping("/vouchers") @ResponseStatus(HttpStatus.CREATED)
    public Voucher createVoucher(@Valid @RequestBody Voucher v) { v.setId(null); checkVoucher(v); return vouchers.save(v); }
    @PutMapping("/vouchers/{id}") @Transactional
    public Voucher updateVoucher(@PathVariable Long id, @Valid @RequestBody Voucher in) {
        Voucher v = vouchers.findById(id).orElseThrow(() -> new NotFoundException("Voucher not found: " + id));
        checkVoucher(in);
        v.setCode(in.getCode()); v.setDiscountType(in.getDiscountType()); v.setDiscountValue(in.getDiscountValue());
        v.setMinOrder(in.getMinOrder()); v.setStartAt(in.getStartAt()); v.setEndAt(in.getEndAt()); v.setUsageLimit(in.getUsageLimit());
        return v;
    }
    @DeleteMapping("/vouchers/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVoucher(@PathVariable Long id) { requireExists(vouchers, id, "Voucher"); vouchers.deleteById(id); vouchers.flush(); }

    private void checkVoucher(Voucher v) {
        if (v.getDiscountType() == DiscountType.PERCENT && v.getDiscountValue().compareTo(java.math.BigDecimal.valueOf(100)) > 0)
            throw new BadRequestException("Percent discount must be <= 100");
        if (v.getStartAt() != null && v.getEndAt() != null && v.getEndAt().isBefore(v.getStartAt()))
            throw new BadRequestException("endAt must be after startAt");
    }

    // ---- users ----
    @GetMapping("/users") public List<UserResponse> listUsers() { return users.findAll().stream().map(UserResponse::of).toList(); }
    @PostMapping("/users") @ResponseStatus(HttpStatus.CREATED)
    public UserResponse createUser(@Valid @RequestBody UserRequest r) {
        if (r.password() == null) throw new BadRequestException("password: required");
        User u = new User(); u.setPasswordHash(encoder.encode(r.password())); return UserResponse.of(users.save(apply(u, r)));
    }
    @PutMapping("/users/{id}") @Transactional
    public UserResponse updateUser(@PathVariable Long id, @Valid @RequestBody UserRequest r) {
        User u = users.findById(id).orElseThrow(() -> new NotFoundException("User not found: " + id));
        if (r.password() != null) u.setPasswordHash(encoder.encode(r.password()));
        return UserResponse.of(apply(u, r));
    }
    @DeleteMapping("/users/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) { requireExists(users, id, "User"); users.deleteById(id); users.flush(); }

    private User apply(User u, UserRequest r) {
        u.setUsername(r.username()); u.setFullName(r.fullName()); u.setPhone(r.phone()); u.setRole(r.role());
        if (r.active() != null) u.setActive(r.active());
        return u;
    }

    // ---- reports ----
    @GetMapping("/reports/revenue")
    public RevenueReport revenue(@RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                 @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to != null ? to : LocalDate.now();
        return reports.revenue(from != null ? from : end, end);
    }

    private static void requireExists(org.springframework.data.jpa.repository.JpaRepository<?, Long> repo, Long id, String what) {
        if (!repo.existsById(id)) throw new NotFoundException(what + " not found: " + id);
    }
}
