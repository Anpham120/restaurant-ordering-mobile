package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.security.AuthUser;
import com.restaurant.orderingsystem.security.Caller;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Delivery order lifecycle (no courier role – store staff deliver):
 * <pre>
 * AWAITING_PAYMENT --transfer received (SePay)--> PENDING   (bank transfer only; expires → CANCELLED)
 * PENDING  --staff-->   CONFIRMED --kitchen--> PREPARING --kitchen--> READY --staff--> DELIVERING --staff--> DELIVERED
 *    |customer/staff        |staff                                                       |staff (failed delivery)
 *    v                      v                                                            v
 * CANCELLED              CANCELLED                                                   CANCELLED
 * </pre>
 * Every change goes through {@link OrderEvents}: history row, payment side effects, customer notification.
 */
@Service
@RequiredArgsConstructor
public class OrderService {
    public static final List<OrderStatus> ACTIVE = List.of(OrderStatus.AWAITING_PAYMENT, OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING,
            OrderStatus.READY, OrderStatus.DELIVERING);
    static final int REVIEW_DAYS = 7;
    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyMMdd");

    private final OrderRepository orders;
    private final UserRepository users;
    private final ReviewRepository reviews;
    private final StoreService store;
    private final AddressService addresses;
    private final CartService cart;
    private final VoucherService vouchers;
    private final PaymentService payments;
    private final OrderEvents events;

    // ================================================================ checkout (customer)
    @Transactional(readOnly = true)
    public CheckoutPreview preview(CheckoutRequest r) { return compute(r).preview(); }

    @Transactional
    public OrderResponse place(CheckoutRequest r) {
        Computed c = compute(r);
        if (!c.preview().canPlace()) throw ApiException.badRequest(String.join(". ", c.preview().problems()));
        Address a = c.address();
        Order o = new Order();
        o.setCustomer(users.getReferenceById(Caller.id()));
        o.setZone(a.getZone());
        o.setRecipientName(a.getRecipientName());
        o.setRecipientPhone(a.getRecipientPhone());
        o.setDeliveryStreet(a.getStreet());
        o.setDeliveryNote(a.getNote());
        o.setNote(CatalogService.blankToNull(r.note()));
        o.setDeliveryFee(a.getZone().getDeliveryFee());
        o.setVoucher(c.voucher());
        o.setDiscountAmount(c.preview().discount());
        for (CartItem line : c.lines()) {
            OrderItem i = new OrderItem();
            i.setOrder(o);
            i.setMenuItem(line.getMenuItem());
            i.setQuantity(line.getQuantity());
            i.setUnitPrice(line.getMenuItem().getPrice());
            i.setNote(line.getNote());
            for (MenuOption opt : line.getOptions()) {
                OrderItemOption io = new OrderItemOption();
                io.setOrderItem(i);
                io.setOption(opt);
                io.setPriceDelta(opt.getPriceDelta());
                i.getOptions().add(io);
            }
            o.getItems().add(i);
        }
        boolean transfer = c.preview().paymentMethod() == PaymentMethod.BANK_TRANSFER;
        o.setStatus(transfer ? OrderStatus.AWAITING_PAYMENT : OrderStatus.PENDING);
        OrderEvents.record(o, o.getStatus(), null, users.getReferenceById(Caller.id()));
        Payment pay = new Payment();
        pay.setOrder(o);
        pay.setMethod(c.preview().paymentMethod());
        pay.setAmount(c.preview().total());
        if (transfer) pay.setExpiresAt(LocalDateTime.now().plusMinutes(store.settings().getTransferTimeoutMinutes()));
        o.setPayment(pay);
        o = orders.save(o);
        cart.clear(Caller.id());
        return toResponse(o);
    }

    private record Computed(CheckoutPreview preview, Address address, List<CartItem> lines, Voucher voucher) {}

    private Computed compute(CheckoutRequest r) {
        long uid = Caller.id();
        List<String> problems = new ArrayList<>();
        StoreSettings s = store.settings();
        String closed = store.closedReason(s);
        if (closed != null) problems.add(closed);

        Address a = addresses.own(r.addressId());
        if (!a.getZone().isActive()) problems.add("Cửa hàng tạm ngưng giao tới " + a.getZone().getName());

        List<CartItem> lines = cart.lines(uid);
        CartResponse view = CartService.view(lines);
        if (lines.isEmpty()) problems.add("Giỏ hàng đang trống");
        if (view.hasProblems()) problems.add("Giỏ hàng có món đã hết hoặc ngừng bán, vui lòng bỏ các món đó");
        BigDecimal subtotal = view.subtotal();
        if (!lines.isEmpty() && subtotal.compareTo(s.getMinOrderAmount()) < 0)
            problems.add("Đơn tối thiểu " + Money.vnd(s.getMinOrderAmount()) + " (chưa tính phí giao)");

        VoucherService.Check v = vouchers.check(r.voucherCode(), subtotal, uid);
        if (v.error() != null) problems.add(v.error());
        List<PaymentMethod> methods = store.paymentMethods(s);
        PaymentMethod method = r.paymentMethod() == null ? PaymentMethod.COD : r.paymentMethod();
        if (!methods.contains(method)) problems.add("Cửa hàng chưa hỗ trợ hình thức thanh toán này");
        BigDecimal fee = Money.of(a.getZone().getDeliveryFee());
        BigDecimal total = subtotal.subtract(v.discount()).add(fee);
        CheckoutPreview p = new CheckoutPreview(view, AddressResponse.of(a), subtotal, fee,
                v.voucher() == null ? null : v.voucher().getCode(), v.discount(), v.error(), Money.of(total),
                a.getZone().getEstimatedMinutes(), method, methods, problems.isEmpty(), problems);
        return new Computed(p, a, lines, v.voucher());
    }

    // ================================================================ customer orders
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> myOrders(int page, int size) {
        long uid = Caller.id();
        Specification<Order> spec = (root, q, cb) -> cb.equal(root.get("customer").get("id"), uid);
        return PageResponse.of(orders.findAll(spec, page(page, size, Sort.by("createdAt").descending())).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public OrderResponse myOrder(Long id) { return toResponse(own(id)); }

    @Transactional
    public OrderResponse cancelByCustomer(Long id, String reason) {
        Order o = own(id);
        if (o.getStatus() != OrderStatus.PENDING && o.getStatus() != OrderStatus.AWAITING_PAYMENT)
            throw ApiException.badRequest("Cửa hàng đã xác nhận đơn, vui lòng gọi hotline nếu cần hủy");
        events.change(o, OrderStatus.CANCELLED, "Khách hủy: " + reason.trim(), Caller.id());
        return toResponse(o);
    }

    @Transactional
    public CartResponse reorder(Long id) { return cart.addAll(own(id).getItems()); }

    @Transactional
    public OrderResponse switchPaymentMethod(Long id, PaymentMethod method) {
        Order o = own(id);
        payments.switchMethod(o, method);
        return toResponse(o);
    }

    Order own(Long id) {
        Order o = find(id);
        if (!o.getCustomer().getId().equals(Caller.id())) throw ApiException.notFound("Không tìm thấy đơn hàng");
        return o;
    }

    // ================================================================ store side
    @Transactional(readOnly = true)
    public PageResponse<OrderResponse> search(List<OrderStatus> statuses, String q, LocalDate date, int page, int size, boolean oldestFirst) {
        String needle = q == null ? "" : q.trim();
        Long idFromCode = parseCode(needle);
        Specification<Order> spec = (root, query, cb) -> {
            List<Predicate> p = new ArrayList<>();
            if (statuses != null && !statuses.isEmpty()) p.add(root.get("status").in(statuses));
            if (date != null) {
                p.add(cb.greaterThanOrEqualTo(root.get("createdAt"), date.atStartOfDay()));
                p.add(cb.lessThan(root.get("createdAt"), date.plusDays(1).atStartOfDay()));
            }
            if (!needle.isEmpty()) {
                List<Predicate> any = new ArrayList<>();
                if (idFromCode != null) any.add(cb.equal(root.get("id"), idFromCode));
                any.add(cb.like(root.get("recipientPhone"), "%" + needle.replaceAll("\\D", "") + "%"));
                any.add(cb.like(cb.lower(root.get("recipientName")), "%" + needle.toLowerCase(Locale.ROOT) + "%"));
                p.add(cb.or(any.toArray(Predicate[]::new)));
            }
            return cb.and(p.toArray(Predicate[]::new));
        };
        Sort sort = oldestFirst ? Sort.by("createdAt").ascending() : Sort.by("createdAt").descending();
        return PageResponse.of(orders.findAll(spec, page(page, size, sort)).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long id) { return toResponse(find(id)); }

    @Transactional(readOnly = true)
    public List<OrderResponse> kitchenQueue() {
        return orders.findByStatusInOrderByCreatedAtAsc(List.of(OrderStatus.CONFIRMED, OrderStatus.PREPARING)).stream().map(this::toResponse).toList();
    }

    @Transactional
    public OrderResponse changeStatus(Long id, OrderStatus to, String note) {
        Order o = find(id);
        AuthUser user = Caller.require();
        OrderStatus from = o.getStatus();
        boolean staff = user.role() == Role.STAFF || user.role() == Role.MANAGER;
        boolean kitchen = user.role() == Role.KITCHEN || user.role() == Role.MANAGER;
        boolean allowed = switch (to) {
            case CONFIRMED -> from == OrderStatus.PENDING && staff;
            case PREPARING -> from == OrderStatus.CONFIRMED && kitchen;
            case READY -> from == OrderStatus.PREPARING && kitchen;
            case DELIVERING -> from == OrderStatus.READY && staff;
            case DELIVERED -> from == OrderStatus.DELIVERING && staff;
            case CANCELLED -> (from == OrderStatus.PENDING || from == OrderStatus.CONFIRMED || from == OrderStatus.DELIVERING) && staff;
            case PENDING, AWAITING_PAYMENT -> false;
        };
        if (!allowed) throw ApiException.badRequest("Không thể chuyển đơn từ \"" + label(from) + "\" sang \"" + label(to) + "\" với vai trò của bạn");
        String reason = CatalogService.blankToNull(note);
        if (to == OrderStatus.CANCELLED && reason == null) throw ApiException.badRequest("Vui lòng nhập lý do hủy đơn");
        events.change(o, to, reason, user.id());
        return toResponse(o);
    }

    // ================================================================ mapping
    Order find(Long id) { return orders.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng")); }

    static String code(Order o) { return "DH" + o.getCreatedAt().format(CODE_DATE) + "-" + String.format("%04d", o.getId()); }

    static Long parseCode(String s) {
        String digits = s.toUpperCase(Locale.ROOT).replaceFirst("^#?DH\\d{6}-", "");
        return digits.matches("\\d{1,12}") ? Long.valueOf(digits) : null;
    }

    /** Price of one unit of the line: base price plus the chosen options, all as charged when ordering. */
    static BigDecimal unitPrice(OrderItem i) {
        return i.getOptions().stream().map(OrderItemOption::getPriceDelta).reduce(i.getUnitPrice(), BigDecimal::add);
    }

    static BigDecimal lineTotal(OrderItem i) { return Money.of(unitPrice(i).multiply(BigDecimal.valueOf(i.getQuantity()))); }

    static BigDecimal subtotal(Order o) {
        return Money.of(o.getItems().stream().map(OrderService::lineTotal).reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    static BigDecimal total(Order o) { return Money.of(subtotal(o).subtract(o.getDiscountAmount()).add(o.getDeliveryFee())); }

    OrderResponse toResponse(Order o) {
        Set<Long> reviewed = o.getStatus() == OrderStatus.DELIVERED ? reviews.reviewedItemIds(o.getId()) : Set.of();
        LocalDateTime deliveredAt = o.getHistory().stream().filter(h -> h.getStatus() == OrderStatus.DELIVERED).map(OrderStatusHistory::getChangedAt).findFirst().orElse(null);
        boolean reviewable = deliveredAt != null && deliveredAt.isAfter(LocalDateTime.now().minusDays(REVIEW_DAYS)) && reviewed.size() < o.getItems().size();
        List<OrderItemResponse> items = o.getItems().stream().map(i -> new OrderItemResponse(i.getId(), i.getMenuItem().getId(), i.getMenuItem().getName(),
                i.getMenuItem().getImageUrl(), i.getQuantity(),
                i.getOptions().stream()
                        .sorted(Comparator.comparingInt((OrderItemOption x) -> x.getOption().getGroup().getSortOrder()).thenComparingInt(x -> x.getOption().getSortOrder()))
                        .map(x -> new ChosenOption(x.getOption().getId(), x.getOption().getGroup().getName(), x.getOption().getName(), x.getPriceDelta())).toList(),
                Money.of(unitPrice(i)), lineTotal(i), i.getNote(), reviewed.contains(i.getId()))).toList();
        List<StatusEvent> timeline = o.getHistory().stream()
                .map(h -> new StatusEvent(h.getStatus(), h.getChangedAt(), h.getChangedBy() == null ? null : h.getChangedBy().getFullName(), h.getNote())).toList();
        User c = o.getCustomer();
        LocalDateTime eta = ACTIVE.contains(o.getStatus()) ? o.getCreatedAt().plusMinutes(o.getZone().getEstimatedMinutes()) : null;
        return new OrderResponse(o.getId(), code(o), o.getStatus(), o.getCreatedAt(), o.getUpdatedAt(),
                c.getId(), c.getFullName(), c.getPhone(),
                o.getRecipientName(), o.getRecipientPhone(), o.getDeliveryStreet(), o.getZone().getName(), o.getDeliveryNote(), o.getNote(),
                items, o.getItems().stream().mapToInt(OrderItem::getQuantity).sum(),
                subtotal(o), o.getDeliveryFee(), o.getVoucher() == null ? null : o.getVoucher().getCode(), o.getDiscountAmount(), total(o),
                payments.toResponse(o.getPayment()), eta,
                o.getStatus() == OrderStatus.PENDING || o.getStatus() == OrderStatus.AWAITING_PAYMENT, reviewable, timeline);
    }

    static String label(OrderStatus s) {
        return switch (s) {
            case AWAITING_PAYMENT -> "Chờ thanh toán";
            case PENDING -> "Chờ xác nhận";
            case CONFIRMED -> "Đã xác nhận";
            case PREPARING -> "Đang chuẩn bị";
            case READY -> "Chờ giao";
            case DELIVERING -> "Đang giao";
            case DELIVERED -> "Đã giao";
            case CANCELLED -> "Đã hủy";
        };
    }

    private static PageRequest page(int page, int size, Sort sort) { return PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100), sort); }
}
