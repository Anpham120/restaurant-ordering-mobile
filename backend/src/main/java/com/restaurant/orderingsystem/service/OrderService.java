package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.BadRequestException;
import com.restaurant.orderingsystem.exception.NotFoundException;
import com.restaurant.orderingsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class OrderService {
    public static final List<OrderStatus> OPEN = List.of(OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.COOKING, OrderStatus.SERVED);
    private static final Map<OrderStatus, Set<OrderStatus>> TRANSITIONS = Map.of(
            OrderStatus.PENDING, Set.of(OrderStatus.CONFIRMED, OrderStatus.COOKING, OrderStatus.CANCELLED),
            OrderStatus.CONFIRMED, Set.of(OrderStatus.COOKING, OrderStatus.CANCELLED),
            OrderStatus.COOKING, Set.of(OrderStatus.SERVED),
            OrderStatus.SERVED, Set.of());

    private final OrderRepository orders;
    private final OrderItemRepository orderItems;
    private final RestaurantTableRepository tables;
    private final MenuItemRepository menuItems;
    private final VoucherRepository vouchers;
    private final UserRepository users;

    @Transactional
    public OrderResponse create(CreateOrderRequest req) {
        RestaurantTable table = tables.findByQrToken(req.qrToken())
                .orElseThrow(() -> new NotFoundException("Table not found for QR token"));
        // A table has at most one open order: extra items go onto it.
        Order order = orders.findFirstByTableIdAndStatusIn(table.getId(), OPEN).orElse(null);
        if (order == null) {
            order = new Order();
            order.setTable(table);
            order.setNote(req.note());
            table.setStatus(TableStatus.OCCUPIED);
        } else if (req.note() != null) {
            order.setNote(req.note());
        }
        addItems(order, req.items());
        if (req.voucherCode() != null && !req.voucherCode().isBlank()) {
            attachVoucher(order, req.voucherCode());
        }
        recalc(order);
        return toResponse(orders.save(order));
    }

    @Transactional
    public OrderResponse addItems(Long orderId, AddItemsRequest req) {
        Order order = openOrder(orderId);
        addItems(order, req.items());
        recalc(order);
        return toResponse(order);
    }

    @Transactional
    public OrderResponse applyVoucher(Long orderId, String code) {
        Order order = openOrder(orderId);
        attachVoucher(order, code);
        recalc(order);
        return toResponse(order);
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long id) { return toResponse(find(id)); }

    @Transactional(readOnly = true)
    public List<OrderResponse> list(OrderStatus status) {
        List<Order> list = status == null ? orders.findAllByOrderByCreatedAtDesc()
                : orders.findByStatusInOrderByCreatedAtAsc(List.of(status));
        return list.stream().map(this::toResponse).toList();
    }

    @Transactional
    public OrderResponse updateStatus(Long id, OrderStatusRequest req) {
        Order order = find(id);
        OrderStatus to = req.status();
        if (!TRANSITIONS.getOrDefault(order.getStatus(), Set.of()).contains(to)) {
            throw new BadRequestException("Cannot change order status from " + order.getStatus() + " to " + to
                    + (to == OrderStatus.COMPLETED ? " (COMPLETED is set by payment)" : ""));
        }
        if (req.staffId() != null) {
            order.setStaff(users.findById(req.staffId()).orElseThrow(() -> new NotFoundException("Staff not found")));
        }
        order.setStatus(to);
        if (to == OrderStatus.CANCELLED) {
            order.getItems().forEach(i -> i.setStatus(OrderItemStatus.CANCELLED));
            order.getTable().setStatus(TableStatus.FREE);
            recalc(order);
        }
        return toResponse(order);
    }

    @Transactional
    public OrderResponse updateItemStatus(Long itemId, OrderItemStatus status) {
        OrderItem item = orderItems.findById(itemId).orElseThrow(() -> new NotFoundException("Order item not found"));
        Order order = item.getOrder();
        if (!OPEN.contains(order.getStatus())) throw new BadRequestException("Order is closed");
        item.setStatus(status);
        List<OrderItem> active = order.getItems().stream().filter(i -> i.getStatus() != OrderItemStatus.CANCELLED).toList();
        boolean early = order.getStatus() == OrderStatus.PENDING || order.getStatus() == OrderStatus.CONFIRMED;
        if (!active.isEmpty() && active.stream().allMatch(i -> i.getStatus() == OrderItemStatus.READY || i.getStatus() == OrderItemStatus.SERVED)) {
            if (order.getStatus() != OrderStatus.SERVED) order.setStatus(OrderStatus.SERVED);
        } else if (early && (status == OrderItemStatus.COOKING || status == OrderItemStatus.READY)) {
            order.setStatus(OrderStatus.COOKING);
        }
        recalc(order);
        return toResponse(order);
    }

    // ---- helpers ----
    Order find(Long id) { return orders.findById(id).orElseThrow(() -> new NotFoundException("Order not found: " + id)); }

    private Order openOrder(Long id) {
        Order o = find(id);
        if (!OPEN.contains(o.getStatus())) throw new BadRequestException("Order is " + o.getStatus() + ", cannot be modified");
        return o;
    }

    private void addItems(Order order, List<OrderItemRequest> reqs) {
        for (OrderItemRequest r : reqs) {
            MenuItem m = menuItems.findById(r.menuItemId()).orElseThrow(() -> new NotFoundException("Menu item not found: " + r.menuItemId()));
            if (!m.isAvailable()) throw new BadRequestException("Menu item is not available: " + m.getName());
            OrderItem oi = new OrderItem();
            oi.setOrder(order);
            oi.setMenuItem(m);
            oi.setQuantity(r.quantity());
            oi.setUnitPrice(m.getPrice());
            oi.setNote(r.note());
            order.getItems().add(oi);
        }
        // new items put a finished order back to cooking
        if (order.getStatus() == OrderStatus.SERVED) order.setStatus(OrderStatus.COOKING);
    }

    private void attachVoucher(Order order, String code) {
        Voucher v = vouchers.findByCodeIgnoreCase(code.trim()).orElseThrow(() -> new BadRequestException("Invalid voucher code"));
        LocalDateTime now = LocalDateTime.now();
        if (v.getStartAt() != null && now.isBefore(v.getStartAt())) throw new BadRequestException("Voucher is not active yet");
        if (v.getEndAt() != null && now.isAfter(v.getEndAt())) throw new BadRequestException("Voucher has expired");
        if (subtotal(order).compareTo(v.getMinOrder()) < 0) throw new BadRequestException("Order total is below the voucher minimum of " + v.getMinOrder());
        if (v.getUsageLimit() != null) {
            long used = orders.countByVoucherIdAndStatusNotAndIdNot(v.getId(), OrderStatus.CANCELLED, order.getId() == null ? -1L : order.getId());
            if (used >= v.getUsageLimit()) throw new BadRequestException("Voucher usage limit reached");
        }
        order.setVoucher(v);
    }

    private BigDecimal subtotal(Order o) {
        return o.getItems().stream().filter(i -> i.getStatus() != OrderItemStatus.CANCELLED)
                .map(i -> i.getUnitPrice().multiply(BigDecimal.valueOf(i.getQuantity())))
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    void recalc(Order o) {
        BigDecimal sub = subtotal(o);
        BigDecimal discount = BigDecimal.ZERO;
        Voucher v = o.getVoucher();
        if (v != null) {
            discount = v.getDiscountType() == DiscountType.PERCENT
                    ? sub.multiply(v.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.HALF_UP)
                    : v.getDiscountValue();
        }
        o.setTotalAmount(sub.subtract(discount).max(BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
    }

    OrderResponse toResponse(Order o) {
        List<OrderItemResponse> items = o.getItems().stream().map(i -> new OrderItemResponse(i.getId(), i.getMenuItem().getId(),
                i.getMenuItem().getName(), i.getQuantity(), i.getUnitPrice(), i.getNote(), i.getStatus())).toList();
        BigDecimal sub = subtotal(o).setScale(2, RoundingMode.HALF_UP);
        return new OrderResponse(o.getId(), o.getTable().getId(), o.getTable().getCode(), o.getStaff() == null ? null : o.getStaff().getId(),
                o.getVoucher() == null ? null : o.getVoucher().getCode(), o.getStatus(), o.getNote(), sub,
                sub.subtract(o.getTotalAmount()), o.getTotalAmount(), o.getCreatedAt(), o.getUpdatedAt(), items);
    }
}
