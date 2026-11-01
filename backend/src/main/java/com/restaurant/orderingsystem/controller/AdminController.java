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

/** Manager back office. */
@RestController @RequestMapping("/api/admin") @RequiredArgsConstructor
public class AdminController {
    private final ReportService reports;
    private final CatalogService catalog;
    private final VoucherService vouchers;
    private final UserAdminService users;
    private final ReviewService reviews;
    private final StoreService store;
    private final PaymentService payments;
    private final PromotionService promotions;

    @GetMapping("/dashboard") public DashboardResponse dashboard() { return reports.dashboard(); }

    @GetMapping("/reports/revenue")
    public RevenueReport revenue(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                 @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) { return reports.revenue(from, to); }

    // menu
    @GetMapping("/categories") public List<CategoryResponse> categories() { return catalog.categories(true); }
    @PostMapping("/categories") @ResponseStatus(HttpStatus.CREATED) public CategoryResponse createCategory(@Valid @RequestBody CategoryRequest r) { return catalog.createCategory(r); }
    @PutMapping("/categories/{id}") public CategoryResponse updateCategory(@PathVariable Long id, @Valid @RequestBody CategoryRequest r) { return catalog.updateCategory(id, r); }
    @DeleteMapping("/categories/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteCategory(@PathVariable Long id) { catalog.deleteCategory(id); }

    @GetMapping("/menu-items") public List<MenuItemResponse> items() { return catalog.menu(null, null, true); }
    @PostMapping("/menu-items") @ResponseStatus(HttpStatus.CREATED) public MenuItemResponse createItem(@Valid @RequestBody MenuItemRequest r) { return catalog.createItem(r); }
    @PutMapping("/menu-items/{id}") public MenuItemResponse updateItem(@PathVariable Long id, @Valid @RequestBody MenuItemRequest r) { return catalog.updateItem(id, r); }
    @DeleteMapping("/menu-items/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteItem(@PathVariable Long id) { catalog.deleteItem(id); }
    @PutMapping("/menu-items/{id}/options") public MenuItemResponse options(@PathVariable Long id, @Valid @RequestBody OptionsRequest r) { return catalog.replaceOptions(id, r); }

    // payments
    @GetMapping("/payments") public List<PaymentListItem> payments(@RequestParam(defaultValue = "REFUND_PENDING") PaymentStatus status) { return payments.list(status); }
    @PatchMapping("/payments/{id}/refunded") public PaymentListItem refunded(@PathVariable Long id) { return payments.markRefunded(id); }
    @GetMapping("/bank-transactions") public List<BankTransactionResponse> bankTransactions(@RequestParam(defaultValue = "100") int limit) { return payments.bankTransactions(limit); }

    // promotions
    @GetMapping("/promotions") public List<PromotionResponse> promotions() { return promotions.all(); }
    @PostMapping("/promotions") @ResponseStatus(HttpStatus.CREATED) public PromotionResponse createPromotion(@Valid @RequestBody PromotionRequest r) { return promotions.create(r); }
    @PutMapping("/promotions/{id}") public PromotionResponse updatePromotion(@PathVariable Long id, @Valid @RequestBody PromotionRequest r) { return promotions.update(id, r); }
    @DeleteMapping("/promotions/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deletePromotion(@PathVariable Long id) { promotions.delete(id); }
    @PostMapping("/promotions/{id}/announce") public AnnounceResponse announce(@PathVariable Long id) { return promotions.announce(id); }


    // vouchers
    @GetMapping("/vouchers") public List<VoucherResponse> vouchers() { return vouchers.all(); }
    @PostMapping("/vouchers") @ResponseStatus(HttpStatus.CREATED) public VoucherResponse createVoucher(@Valid @RequestBody VoucherRequest r) { return vouchers.create(r); }
    @PutMapping("/vouchers/{id}") public VoucherResponse updateVoucher(@PathVariable Long id, @Valid @RequestBody VoucherRequest r) { return vouchers.update(id, r); }
    @DeleteMapping("/vouchers/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteVoucher(@PathVariable Long id) { vouchers.delete(id); }

    // people
    @GetMapping("/staff") public List<UserResponse> staff() { return users.staff(); }
    @PostMapping("/staff") @ResponseStatus(HttpStatus.CREATED) public UserResponse createStaff(@Valid @RequestBody StaffRequest r) { return users.createStaff(r); }
    @PutMapping("/staff/{id}") public UserResponse updateStaff(@PathVariable Long id, @Valid @RequestBody StaffRequest r) { return users.updateStaff(id, r); }
    @DeleteMapping("/staff/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void deleteStaff(@PathVariable Long id) { users.deleteStaff(id); }
    @GetMapping("/customers")
    public PageResponse<CustomerSummary> customers(@RequestParam(required = false) String q, @RequestParam(defaultValue = "0") int page,
                                                   @RequestParam(defaultValue = "20") int size) { return users.customers(q, page, size); }
    @PatchMapping("/users/{id}/active") public UserResponse active(@PathVariable Long id, @Valid @RequestBody ActiveRequest r) { return users.setActive(id, r.active()); }
    @PostMapping("/users/{id}/reset-password") public TempPasswordResponse resetPassword(@PathVariable Long id) { return users.resetPassword(id); }

    // reviews & settings
    @GetMapping("/reviews") public List<ReviewResponse> reviews(@RequestParam(defaultValue = "50") int limit) { return reviews.latest(limit); }
    @GetMapping("/settings") public StoreResponse settings() { return store.info(); }
    @PutMapping("/settings") public StoreResponse updateSettings(@Valid @RequestBody StoreSettingsRequest r) { return store.update(r); }
}
