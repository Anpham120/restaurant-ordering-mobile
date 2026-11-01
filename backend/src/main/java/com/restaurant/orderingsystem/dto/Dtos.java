package com.restaurant.orderingsystem.dto;

import com.restaurant.orderingsystem.entity.*;
import jakarta.validation.Valid;
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

    /** Vietnamese mobile numbers since 2018: 10 digits, 03/05/07/08/09. */
    public static final String PHONE = "^0[35789][0-9]{8}$";
    public static final String PHONE_MSG = "phải là số di động Việt Nam gồm 10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09";
    /** name@domain.tld (the e-mail is where password reset codes are sent, so a plausible address is required). */
    public static final String EMAIL = "^[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(\\.[A-Za-z0-9-]+)*\\.[A-Za-z]{2,}$";
    public static final String EMAIL_MSG = "không đúng định dạng email (ví dụ ten@gmail.com)";
    /** At least 8 characters with a lowercase and an uppercase letter, a digit and a special character, no spaces. */
    public static final String PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9\\s])\\S{8,72}$";
    public static final String PASSWORD_MSG = "cần 8–72 ký tự, có chữ hoa, chữ thường, chữ số và ký tự đặc biệt, không có khoảng trắng";
    /** Letters (any language, with diacritics), spaces, dots, apostrophes and hyphens; 2–100 characters. */
    public static final String NAME = "^[\\p{L}\\p{M}][\\p{L}\\p{M} .'-]{1,99}$";
    public static final String NAME_MSG = "chỉ gồm chữ cái và khoảng trắng, 2–100 ký tự";
    private static final String CODE = "^[A-Za-z0-9_-]+$";
    private static final String CODE_MSG = "chỉ gồm chữ, số, '-' hoặc '_'";
    private static final String URL = "^https?://.+";
    private static final String URL_MSG = "phải là liên kết http(s)";

    // =============================================================== auth & profile
    public record RegisterRequest(@NotBlank @Size(max = 100) @Pattern(regexp = NAME, message = NAME_MSG) String fullName,
                                  @NotBlank @Pattern(regexp = PHONE, message = PHONE_MSG) String phone,
                                  @NotBlank(message = "là bắt buộc (dùng để nhận mã khi quên mật khẩu)") @Size(max = 120) @Pattern(regexp = EMAIL, message = EMAIL_MSG) String email,
                                  @NotBlank @Pattern(regexp = PASSWORD, message = PASSWORD_MSG) String password) {}
    /** login = phone number or email. */
    public record LoginRequest(@NotBlank @Size(max = 120) String login, @NotBlank @Size(max = 72) String password) {}
    public record ChangePasswordRequest(@NotBlank String currentPassword, @NotBlank @Pattern(regexp = PASSWORD, message = PASSWORD_MSG) String newPassword) {}
    /** email: null keeps the current address; "" removes it (staff only: a customer needs it for password reset). */
    public record ProfileRequest(@NotBlank @Size(max = 100) @Pattern(regexp = NAME, message = NAME_MSG) String fullName,
                                 @Size(max = 120) @Pattern(regexp = "^$|" + EMAIL, message = EMAIL_MSG) String email, Boolean marketingOptIn) {}
    public record ForgotPasswordRequest(@NotBlank @Size(max = 120) String login) {}
    public record ResetPasswordRequest(@NotBlank @Size(max = 120) String login,
                                       @NotBlank @Pattern(regexp = "^[0-9]{6}$", message = "gồm 6 chữ số") String code,
                                       @NotBlank @Pattern(regexp = PASSWORD, message = PASSWORD_MSG) String newPassword) {}
    public record MessageResponse(String message) {}
    public record TempPasswordResponse(String temporaryPassword) {}

    public record UserResponse(Long id, String fullName, String phone, String email, Role role, boolean active, LocalDateTime createdAt,
                               boolean mustChangePassword, boolean marketingOptIn) {
        public static UserResponse of(User u) {
            return new UserResponse(u.getId(), u.getFullName(), u.getPhone(), u.getEmail(), u.getRole(), u.isActive(), u.getCreatedAt(),
                    u.isMustChangePassword(), u.isMarketingOptIn());
        }
    }
    public record AuthResponse(String token, LocalDateTime expiresAt, UserResponse user) {}

    // =============================================================== store
    public record StoreResponse(String storeName, String hotline, String storeAddress, LocalTime openTime, LocalTime closeTime,
                                BigDecimal minOrderAmount, boolean acceptingOrders, boolean openNow, String closedReason,
                                List<PaymentMethod> paymentMethods, String bankCode, String bankAccount, String bankHolder, int transferTimeoutMinutes,
                                BigDecimal latitude, BigDecimal longitude, BigDecimal deliveryBaseKm, BigDecimal deliveryBaseFee,
                                BigDecimal deliveryExtraFeePerKm, BigDecimal deliveryMaxKm, int prepMinutes, int minutesPerKm) {}
    public record StoreSettingsRequest(@NotBlank @Size(max = 100) String storeName,
                                       @NotBlank @Pattern(regexp = "^[0-9]{8,15}$", message = "chỉ gồm 8–15 chữ số") String hotline,
                                       @NotBlank @Size(max = 200) String storeAddress,
                                       @NotNull LocalTime openTime, @NotNull LocalTime closeTime,
                                       @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal minOrderAmount,
                                       boolean acceptingOrders,
                                       @Size(max = 20) String bankCode,
                                       @Size(max = 19) @Pattern(regexp = "^[A-Za-z0-9]*$", message = "chỉ gồm chữ và số") String bankAccount,
                                       @Size(max = 80) String bankHolder,
                                       @Min(5) @Max(120) Integer transferTimeoutMinutes,
                                       // restaurant position and delivery pricing; null = leave unchanged
                                       @DecimalMin("-90") @DecimalMax("90") @Digits(integer = 2, fraction = 6) BigDecimal latitude,
                                       @DecimalMin("-180") @DecimalMax("180") @Digits(integer = 3, fraction = 6) BigDecimal longitude,
                                       @DecimalMin(value = "0.5") @DecimalMax("99") @Digits(integer = 2, fraction = 1) BigDecimal deliveryBaseKm,
                                       @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal deliveryBaseFee,
                                       @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal deliveryExtraFeePerKm,
                                       @DecimalMin(value = "0.5") @DecimalMax("99") @Digits(integer = 2, fraction = 1) BigDecimal deliveryMaxKm,
                                       @Min(0) @Max(240) Integer prepMinutes,
                                       @Min(1) @Max(30) Integer minutesPerKm) {}
    public record AcceptingRequest(boolean acceptingOrders) {}

    // =============================================================== delivery and addresses
    /** Distance from the restaurant, delivery fee and estimate for a map position; deliverable=false carries the reason. */
    public record DeliveryQuote(BigDecimal distanceKm, BigDecimal deliveryFee, int estimatedMinutes, boolean deliverable, String message) {}
    /** One place found by the address search (OpenStreetMap), with its position. */
    public record GeoPlace(String name, BigDecimal latitude, BigDecimal longitude) {}

    public record AddressRequest(@NotBlank @Size(max = 40) String label,
                                 @NotBlank @Size(max = 100) String recipientName,
                                 @NotBlank @Pattern(regexp = PHONE, message = PHONE_MSG) String recipientPhone,
                                 @NotBlank @Size(max = 200) String street,
                                 @NotNull @DecimalMin("-90") @DecimalMax("90") @Digits(integer = 2, fraction = 6) BigDecimal latitude,
                                 @NotNull @DecimalMin("-180") @DecimalMax("180") @Digits(integer = 3, fraction = 6) BigDecimal longitude,
                                 @Size(max = 200) String note,
                                 boolean makeDefault) {}
    /** distanceKm, deliveryFee, estimatedMinutes and deliverable are computed from the position with the current pricing. */
    public record AddressResponse(Long id, String label, String recipientName, String recipientPhone, String street, String note, boolean isDefault,
                                  BigDecimal latitude, BigDecimal longitude, boolean hasLocation,
                                  BigDecimal distanceKm, BigDecimal deliveryFee, int estimatedMinutes, boolean deliverable, String deliveryMessage) {
        public static AddressResponse of(Address a, DeliveryQuote q) {
            return new AddressResponse(a.getId(), a.getLabel(), a.getRecipientName(), a.getRecipientPhone(), a.getStreet(), a.getNote(), a.isDefaultAddress(),
                    a.getLatitude(), a.getLongitude(), a.getLatitude() != null,
                    q.distanceKm(), q.deliveryFee(), q.estimatedMinutes(), q.deliverable(), q.message());
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
    public record OptionResponse(Long id, String name, BigDecimal priceDelta, boolean available) {}
    public record OptionGroupResponse(Long id, String name, int minSelect, int maxSelect, List<OptionResponse> options) {}
    public record MenuItemResponse(Long id, Long categoryId, String categoryName, String name, String description, BigDecimal price,
                                   String imageUrl, boolean available, boolean active, Double ratingAvg, long ratingCount, long soldCount,
                                   boolean favorite, List<OptionGroupResponse> optionGroups) {}
    public record OptionRequest(Long id, @NotBlank @Size(max = 60) String name,
                                @NotNull @DecimalMin("0") @Digits(integer = 10, fraction = 2) BigDecimal priceDelta, Boolean available) {}
    public record OptionGroupRequest(Long id, @NotBlank @Size(max = 60) String name, @Min(0) @Max(20) int minSelect, @Min(1) @Max(20) int maxSelect,
                                     @NotEmpty @Size(max = 20) List<@Valid @NotNull OptionRequest> options) {}
    public record OptionsRequest(@NotNull @Size(max = 10) List<@Valid @NotNull OptionGroupRequest> groups) {}
    public record MenuItemDetail(MenuItemResponse item, List<ReviewResponse> reviews) {}
    public record AvailabilityRequest(boolean available) {}

    // =============================================================== cart & checkout
    public record AddToCartRequest(@NotNull Long menuItemId, @Min(1) @Max(99) int quantity, @Size(max = 200) String note,
                                   @Size(max = 30) List<@NotNull Long> optionIds) {}
    public record CartLineRequest(@Min(0) @Max(99) int quantity, @Size(max = 200) String note) {}
    public record ChosenOption(Long id, String groupName, String name, BigDecimal priceDelta) {}
    public record CartLine(Long lineId, Long menuItemId, String name, String imageUrl, BigDecimal basePrice, List<ChosenOption> options,
                           BigDecimal unitPrice, int quantity, String note, BigDecimal lineTotal, boolean orderable, String problem) {}
    public record CartResponse(List<CartLine> lines, int itemCount, BigDecimal subtotal, boolean hasProblems) {}
    public record CheckoutRequest(@NotNull Long addressId, @Size(max = 40) String voucherCode, @Size(max = 300) String note, PaymentMethod paymentMethod) {}
    public record CheckoutPreview(CartResponse cart, AddressResponse address, BigDecimal subtotal, BigDecimal deliveryFee,
                                  String voucherCode, BigDecimal discount, String voucherMessage, BigDecimal total,
                                  int estimatedMinutes, PaymentMethod paymentMethod, List<PaymentMethod> paymentMethods, boolean canPlace, List<String> problems) {}

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

    public record OrderItemResponse(Long id, Long menuItemId, String name, String imageUrl, int quantity, List<ChosenOption> options,
                                    BigDecimal unitPrice, BigDecimal lineTotal, String note, boolean reviewed) {}
    /** Payment of an order; for a pending bank transfer it carries everything needed to show the VietQR code. */
    public record PaymentResponse(Long id, PaymentMethod method, BigDecimal amount, PaymentStatus status, LocalDateTime expiresAt,
                                  LocalDateTime paidAt, String confirmedByName, String transferContent, String qrUrl,
                                  String bankCode, String bankAccount, String bankHolder, List<BankAppLink> bankApps,
                                  boolean canSwitchToCod, boolean canSwitchToTransfer) {}
    /** Opens a Vietnamese banking app with the transfer prefilled (VietQR deeplink, https://www.vietqr.io). */
    public record BankAppLink(String appId, String name, String logoUrl, String url) {}
    public record PaymentMethodRequest(@NotNull PaymentMethod method) {}
    public record StatusEvent(OrderStatus status, LocalDateTime at, String byName, String note) {}
    public record OrderResponse(Long id, String code, OrderStatus status, LocalDateTime createdAt, LocalDateTime updatedAt,
                                Long customerId, String customerName, String customerPhone,
                                String recipientName, String recipientPhone, String deliveryStreet, BigDecimal distanceKm, String deliveryNote,
                                String note, List<OrderItemResponse> items, int itemCount,
                                BigDecimal subtotal, BigDecimal deliveryFee, String voucherCode, BigDecimal discount, BigDecimal total,
                                PaymentResponse payment, LocalDateTime estimatedDeliveryAt,
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
                               @Size(max = 120) @Pattern(regexp = "^$|" + EMAIL, message = EMAIL_MSG) String email,
                               @Pattern(regexp = PASSWORD, message = PASSWORD_MSG) String password,
                               @NotNull Role role,
                               Boolean active) {}
    public record ActiveRequest(boolean active) {}
    public record CustomerSummary(Long id, String fullName, String phone, String email, boolean active, LocalDateTime createdAt, long orderCount) {}

    public record DailyRevenue(LocalDate date, BigDecimal revenue, long orders) {}
    public record TopItem(Long menuItemId, String name, String imageUrl, long quantity, BigDecimal revenue) {}
    public record DistanceRevenue(String band, BigDecimal revenue, long orders) {}
    public record RevenueReport(LocalDate from, LocalDate to, BigDecimal revenue, long deliveredOrders, long cancelledOrders,
                                BigDecimal averageOrderValue, List<DailyRevenue> daily, List<TopItem> topItems, List<DistanceRevenue> byDistance) {}
    public record DashboardResponse(BigDecimal revenueToday, BigDecimal revenueYesterday, long deliveredToday, long cancelledToday,
                                    long pendingOrders, long activeOrders, long awaitingPayment, long pendingRefunds, BigDecimal averageOrderValueToday,
                                    Double ratingAvg7d, long ratingCount7d, long newCustomersToday, boolean acceptingOrders,
                                    List<DailyRevenue> last7Days, List<TopItem> topItemsToday, List<OrderResponse> recentOrders) {}

    // =============================================================== payments (admin), SePay
    public record PaymentListItem(Long id, Long orderId, String orderCode, String customerName, PaymentMethod method, BigDecimal amount,
                                  PaymentStatus status, LocalDateTime createdAt, LocalDateTime paidAt, String confirmedByName) {}
    public record BankTransactionResponse(Long id, String provider, Long providerTxnId, String gateway, String accountNumber, BigDecimal amount,
                                          String content, String referenceCode, LocalDateTime transactionDate, LocalDateTime receivedAt,
                                          Long orderId, String orderCode, String note) {}
    /** Body SePay posts to our webhook (https://docs.sepay.vn/tich-hop-webhooks.html). */
    public record SepayWebhook(Long id, String gateway, String transactionDate, String accountNumber, String subAccount, String code,
                               String content, String transferType, String description, BigDecimal transferAmount, BigDecimal accumulated,
                               String referenceCode) {}

    // =============================================================== promotions & notifications
    public record PromotionRequest(@NotBlank @Size(max = 120) String title,
                                   @Size(max = 300) String subtitle,
                                   @NotBlank @Size(max = 500) @Pattern(regexp = URL, message = URL_MSG) String imageUrl,
                                   @NotNull PromotionTarget targetType,
                                   Long menuItemId, Long categoryId, Long voucherId,
                                   LocalDateTime startAt, LocalDateTime endAt,
                                   @Min(0) @Max(999) int sortOrder,
                                   Boolean active) {}
    public record PromotionResponse(Long id, String title, String subtitle, String imageUrl, PromotionTarget targetType,
                                    Long menuItemId, String menuItemName, Long categoryId, String categoryName, Long voucherId, String voucherCode,
                                    LocalDateTime startAt, LocalDateTime endAt, int sortOrder, boolean active, boolean live, boolean notified,
                                    LocalDateTime announceAt, LocalDateTime announcedAt) {}
    /** Result of announcing a promotion: sent now, or scheduled for after the quiet hours. */
    public record AnnounceResponse(long sent, long skipped, LocalDateTime scheduledAt, String message) {}
    /** Unread notifications: order/payment ones drive the red badge; promotions only show a dot. */
    public record UnreadResponse(long count, long promotions) {}
    public record NotificationResponse(Long id, NotificationType type, String title, String body, Long orderId, Long promotionId,
                                       boolean read, LocalDateTime createdAt) {}
    public record CountResponse(long count) {}
}
