package com.restaurant.orderingsystem.dto;

import com.restaurant.orderingsystem.entity.*;
import jakarta.validation.constraints.*;
import org.springframework.data.domain.Page;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

/** Request and response bodies of the REST API. Entities never leave the service layer. */
public final class Dtos {
    private Dtos() {}

    public static final String PHONE = "^0[0-9]{9,10}$";
    public static final String PHONE_MSG = "phải là số điện thoại Việt Nam (10–11 số, bắt đầu bằng 0)";
    private static final String CODE = "^[A-Za-z0-9_-]+$";
    private static final String CODE_MSG = "chỉ gồm chữ, số, '-' hoặc '_'";
    private static final String URL = "^https?://.+";
    private static final String URL_MSG = "phải là liên kết http(s)";

    // =============================================================== auth & profile
    public record RegisterRequest(@NotBlank @Size(max = 100) String fullName,
                                  @NotBlank @Pattern(regexp = PHONE, message = PHONE_MSG) String phone,
                                  @Email @Size(max = 120) String email,
                                  @NotBlank @Size(min = 8, max = 72) String password) {}
    /** login = phone number or email. */
    public record LoginRequest(@NotBlank @Size(max = 120) String login, @NotBlank @Size(max = 72) String password) {}
    public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank @Size(min = 8, max = 72) String newPassword) {}
    public record ProfileRequest(@NotBlank @Size(max = 100) String fullName, @Email @Size(max = 120) String email) {}

    public record UserResponse(Long id, String fullName, String phone, String email, Role role, boolean active, LocalDateTime createdAt) {
        public static UserResponse of(User u) { return new UserResponse(u.getId(), u.getFullName(), u.getPhone(), u.getEmail(), u.getRole(), u.isActive(), u.getCreatedAt()); }
    }
    public record AuthResponse(String token, LocalDateTime expiresAt, UserResponse user) {}

    // =============================================================== store
    public record StoreResponse(String storeName, String hotline, String storeAddress, LocalTime openTime, LocalTime closeTime,
                                BigDecimal minOrderAmount, boolean acceptingOrders, boolean openNow, String closedReason) {}
    public record StoreSettingsRequest(@NotBlank @Size(max = 100) String storeName,
                                       @NotBlank @Pattern(regexp = "^[0-9]{8,15}$", message = "chỉ gồm 8–15 chữ số") String hotline,
                                       @NotBlank @Size(max = 200) String storeAddress,
                                       @NotNull LocalTime openTime, @NotNull LocalTime closeTime,
                                       @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal minOrderAmount,
                                       boolean acceptingOrders) {}
    public record AcceptingRequest(boolean acceptingOrders) {}

    // =============================================================== zones
    public record ZoneRequest(@NotBlank @Size(max = 60) String name,
                              @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal deliveryFee,
                              @Min(5) @Max(240) int estimatedMinutes,
                              @Min(0) @Max(999) int sortOrder,
                              Boolean active) {}
    public record ZoneResponse(Long id, String name, BigDecimal deliveryFee, int estimatedMinutes, int sortOrder, boolean active) {
        public static ZoneResponse of(DeliveryZone z) { return new ZoneResponse(z.getId(), z.getName(), z.getDeliveryFee(), z.getEstimatedMinutes(), z.getSortOrder(), z.isActive()); }
    }

    // =============================================================== addresses
    public record AddressRequest(@NotNull Long zoneId,
                                 @NotBlank @Size(max = 40) String label,
                                 @NotBlank @Size(max = 100) String recipientName,
                                 @NotBlank @Pattern(regexp = PHONE, message = PHONE_MSG) String recipientPhone,
                                 @NotBlank @Size(max = 200) String street,
                                 @Size(max = 200) String note,
                                 boolean makeDefault) {}
    public record AddressResponse(Long id, Long zoneId, String zoneName, BigDecimal deliveryFee, int estimatedMinutes, boolean zoneActive,
                                  String label, String recipientName, String recipientPhone, String street, String note, boolean isDefault) {
        public static AddressResponse of(Address a) {
            DeliveryZone z = a.getZone();
            return new AddressResponse(a.getId(), z.getId(), z.getName(), z.getDeliveryFee(), z.getEstimatedMinutes(), z.isActive(),
                    a.getLabel(), a.getRecipientName(), a.getRecipientPhone(), a.getStreet(), a.getNote(), a.isDefaultAddress());
        }
    }

    // =============================================================== menu
    public record CategoryRequest(@NotBlank @Size(max = 60) String name,
                                  @Size(max = 500) @Pattern(regexp = URL, message = URL_MSG) String imageUrl,
                                  @Min(0) @Max(999) int sortOrder) {}
    public record CategoryResponse(Long id, String name, String imageUrl, int sortOrder, long itemCount) {}
    public record MenuItemRequest(@NotNull Long categoryId,
                                  @NotBlank @Size(max = 120) String name,
                                  @Size(max = 500) String description,
                                  @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal price,
                                  @Size(max = 500) @Pattern(regexp = URL, message = URL_MSG) String imageUrl,
                                  Boolean available,
                                  Boolean active) {}
    public record MenuItemResponse(Long id, Long categoryId, String categoryName, String name, String description, BigDecimal price,
                                   String imageUrl, boolean available, boolean active, Double ratingAvg, long ratingCount, long soldCount,
                                   boolean favorite) {}
    public record MenuItemDetail(MenuItemResponse item, List<ReviewResponse> reviews) {}
    public record AvailabilityRequest(boolean available) {}

    // =============================================================== cart & checkout
    public record CartItemRequest(@Min(0) @Max(99) int quantity, @Size(max = 200) String note) {}
    public record CartLine(Long menuItemId, String name, String imageUrl, BigDecimal unitPrice, int quantity, String note,
                           BigDecimal lineTotal, boolean orderable, String problem) {}
    public record CartResponse(List<CartLine> lines, int itemCount, BigDecimal subtotal, boolean hasProblems) {}
    public record CheckoutRequest(@NotNull Long addressId, @Size(max = 40) String voucherCode, @Size(max = 300) String note) {}
    public record CheckoutPreview(CartResponse cart, AddressResponse address, BigDecimal subtotal, BigDecimal deliveryFee,
                                  String voucherCode, BigDecimal discount, String voucherMessage, BigDecimal total,
                                  int estimatedMinutes, boolean canPlace, List<String> problems) {}

    // =============================================================== vouchers
    public record VoucherRequest(@NotBlank @Size(max = 40) @Pattern(regexp = CODE, message = CODE_MSG) String code,
                                 @Size(max = 200) String description,
                                 @NotNull DiscountType discountType,
                                 @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 10, fraction = 2) BigDecimal discountValue,
                                 @DecimalMin(value = "0", inclusive = false) @Digits(integer = 10, fraction = 2) BigDecimal maxDiscount,
                                 @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal minOrder,
                                 LocalDateTime startAt, LocalDateTime endAt,
                                 @Min(1) Integer usageLimit, @Min(1) Integer perUserLimit,
                                 Boolean active) {}
    public record VoucherResponse(Long id, String code, String description, DiscountType discountType, BigDecimal discountValue,
                                  BigDecimal maxDiscount, BigDecimal minOrder, LocalDateTime startAt, LocalDateTime endAt,
                                  Integer usageLimit, Integer perUserLimit, boolean active, long usedCount) {}

    // =============================================================== orders
    public record CancelRequest(@NotBlank @Size(max = 300) String reason) {}
    public record StatusRequest(@NotNull OrderStatus status, @Size(max = 300) String note) {}

    public record OrderItemResponse(Long id, Long menuItemId, String name, String imageUrl, int quantity, BigDecimal unitPrice,
                                    BigDecimal lineTotal, String note, boolean reviewed) {}
    public record StatusEvent(OrderStatus status, LocalDateTime at, String byName, String note) {}
    public record OrderResponse(Long id, String code, OrderStatus status, LocalDateTime createdAt, LocalDateTime updatedAt,
                                Long customerId, String customerName, String customerPhone,
                                String recipientName, String recipientPhone, String deliveryStreet, String zoneName, String deliveryNote,
                                String note, List<OrderItemResponse> items, int itemCount,
                                BigDecimal subtotal, BigDecimal deliveryFee, String voucherCode, BigDecimal discount, BigDecimal total,
                                PaymentMethod paymentMethod, boolean paid, LocalDateTime estimatedDeliveryAt,
                                boolean cancellable, boolean reviewable, List<StatusEvent> timeline) {}
    public record PageResponse<T>(List<T> content, int page, int size, long totalElements, int totalPages) {
        public static <T> PageResponse<T> of(Page<T> p) { return new PageResponse<>(p.getContent(), p.getNumber(), p.getSize(), p.getTotalElements(), p.getTotalPages()); }
    }

    // =============================================================== reviews
    public record ReviewRequest(@NotNull Long orderItemId, @Min(1) @Max(5) int rating, @Size(max = 500) String comment) {}
    public record ReviewResponse(Long id, Long orderItemId, Long orderId, Long menuItemId, String menuItemName, String customerName,
                                 int rating, String comment, LocalDateTime createdAt) {}

    // =============================================================== admin
    public record StaffRequest(@NotBlank @Size(max = 100) String fullName,
                               @NotBlank @Pattern(regexp = PHONE, message = PHONE_MSG) String phone,
                               @Email @Size(max = 120) String email,
                               @Size(min = 8, max = 72) String password,
                               @NotNull Role role,
                               Boolean active) {}
    public record ActiveRequest(boolean active) {}
    public record CustomerSummary(Long id, String fullName, String phone, String email, boolean active, LocalDateTime createdAt, long orderCount) {}

    public record DailyRevenue(LocalDate date, BigDecimal revenue, long orders) {}
    public record TopItem(Long menuItemId, String name, String imageUrl, long quantity, BigDecimal revenue) {}
    public record ZoneRevenue(String zone, BigDecimal revenue, long orders) {}
    public record RevenueReport(LocalDate from, LocalDate to, BigDecimal revenue, long deliveredOrders, long cancelledOrders,
                                BigDecimal averageOrderValue, List<DailyRevenue> daily, List<TopItem> topItems, List<ZoneRevenue> byZone) {}
    public record DashboardResponse(BigDecimal revenueToday, BigDecimal revenueYesterday, long deliveredToday, long cancelledToday,
                                    long pendingOrders, long activeOrders, BigDecimal averageOrderValueToday,
                                    Double ratingAvg7d, long ratingCount7d, long newCustomersToday, boolean acceptingOrders,
                                    List<DailyRevenue> last7Days, List<TopItem> topItemsToday, List<OrderResponse> recentOrders) {}
}
