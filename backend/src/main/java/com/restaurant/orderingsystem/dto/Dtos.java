package com.restaurant.orderingsystem.dto;

import com.restaurant.orderingsystem.entity.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public final class Dtos {
    private Dtos() {}

    // ---- requests ----
    public record LoginRequest(@NotBlank String username, @NotBlank String password) {}
    public record MenuItemRequest(@NotNull Long categoryId, @NotBlank @Size(max = 120) String name, @Size(max = 500) String description,
                                  @NotNull @DecimalMin("0") BigDecimal price, String imageUrl, Boolean available) {}
    public record TableRequest(@NotBlank @Size(max = 20) String code, @Min(1) int seats) {}
    public record UserRequest(@NotBlank @Size(max = 50) String username, @Size(min = 6) String password, @NotBlank String fullName,
                              String phone, @NotNull Role role, Boolean active) {}
    public record OrderItemRequest(@NotNull Long menuItemId, @Min(1) int quantity, @Size(max = 255) String note) {}
    public record CreateOrderRequest(@NotBlank String qrToken, @NotEmpty List<@Valid OrderItemRequest> items,
                                     @Size(max = 255) String note, String voucherCode) {}
    public record AddItemsRequest(@NotEmpty List<@Valid OrderItemRequest> items) {}
    public record OrderStatusRequest(@NotNull OrderStatus status, Long staffId) {}
    public record OrderItemStatusRequest(@NotNull OrderItemStatus status) {}
    public record VoucherCodeRequest(@NotBlank String code) {}
    public record PaymentRequest(@NotNull PaymentMethod method) {}
    public record ServiceRequestCreate(@NotBlank String qrToken, @NotNull RequestType type) {}
    public record ReviewRequest(@NotNull Long orderId, @NotNull Long menuItemId, @Min(1) @Max(5) int rating, @Size(max = 500) String comment) {}

    // ---- responses ----
    public record UserResponse(Long id, String username, String fullName, String phone, Role role, boolean active) {
        public static UserResponse of(User u) { return new UserResponse(u.getId(), u.getUsername(), u.getFullName(), u.getPhone(), u.getRole(), u.isActive()); }
    }
    public record LoginResponse(String token, UserResponse user) {}
    public record OrderItemResponse(Long id, Long menuItemId, String name, int quantity, BigDecimal unitPrice, String note, OrderItemStatus status) {}
    public record OrderResponse(Long id, Long tableId, String tableCode, Long staffId, String voucherCode, OrderStatus status, String note,
                                BigDecimal subtotal, BigDecimal discount, BigDecimal totalAmount, LocalDateTime createdAt,
                                LocalDateTime updatedAt, List<OrderItemResponse> items) {}
    public record PaymentResponse(Long id, Long orderId, PaymentMethod method, BigDecimal amount, PaymentStatus status, LocalDateTime paidAt) {
        public static PaymentResponse of(Payment p) { return new PaymentResponse(p.getId(), p.getOrder().getId(), p.getMethod(), p.getAmount(), p.getStatus(), p.getPaidAt()); }
    }
    public record ServiceRequestResponse(Long id, Long tableId, String tableCode, RequestType type, RequestStatus status, LocalDateTime createdAt) {
        public static ServiceRequestResponse of(ServiceRequest s) { return new ServiceRequestResponse(s.getId(), s.getTable().getId(), s.getTable().getCode(), s.getType(), s.getStatus(), s.getCreatedAt()); }
    }
    public record ReviewResponse(Long id, Long orderId, Long menuItemId, int rating, String comment, LocalDateTime createdAt) {
        public static ReviewResponse of(Review r) { return new ReviewResponse(r.getId(), r.getOrder().getId(), r.getMenuItem().getId(), r.getRating(), r.getComment(), r.getCreatedAt()); }
    }
    public record DailyRevenue(LocalDate date, BigDecimal revenue, long orders) {}
    public record TopItem(Long menuItemId, String name, long quantity) {}
    public record RevenueReport(LocalDate from, LocalDate to, BigDecimal totalRevenue, long orderCount, List<DailyRevenue> daily, List<TopItem> topItems) {}
}
