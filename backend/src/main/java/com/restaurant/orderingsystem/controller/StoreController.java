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

/** Store staff (STAFF), kitchen (KITCHEN) and managers: the order board, kitchen queue, stock and order intake. */
@RestController @RequestMapping("/api/manage") @RequiredArgsConstructor
public class StoreController {
    private final OrderService orders;
    private final CatalogService catalog;
    private final StoreService store;
    private final PaymentService payments;
    private final ShipperService shipper;
    private final NotificationService notifications;
    private final FeedbackService feedback;

    @GetMapping("/orders")
    public PageResponse<OrderResponse> orders(@RequestParam(required = false) List<OrderStatus> status,
                                              @RequestParam(required = false) String q,
                                              @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
                                              @RequestParam(defaultValue = "0") int page,
                                              @RequestParam(defaultValue = "50") int size,
                                              @RequestParam(defaultValue = "newest") String sort) {
        return orders.search(status, q, date, page, size, "oldest".equals(sort));
    }

    @GetMapping("/orders/{id}") public OrderResponse order(@PathVariable Long id) { return orders.get(id); }

    @PatchMapping("/orders/{id}/status")
    public OrderResponse status(@PathVariable Long id, @Valid @RequestBody StatusRequest r) { return orders.changeStatus(id, r.status(), r.note()); }

    /** A transfer that arrived but was not matched automatically (e.g. wrong content). */
    @PatchMapping("/orders/{id}/confirm-transfer")
    public PaymentResponse confirmTransfer(@PathVariable Long id) {
        if (!Caller.is(Role.STAFF, Role.MANAGER)) throw ApiException.forbidden("Chỉ nhân viên hoặc quản lý được xác nhận thanh toán");
        return payments.confirmTransfer(id);
    }

    /** Photo the shipper took at the door. */
    @GetMapping("/orders/{id}/delivery-proof") public DeliveryProofResponse proof(@PathVariable Long id) { return shipper.proof(id); }

    // notifications for staff and managers: delivery confirmed / failed (sent by ShipperService)
    @GetMapping("/notifications")
    public List<NotificationResponse> notifications(@RequestParam(defaultValue = "50") int limit) { return notifications.mine(limit, "ORDER"); }
    @GetMapping("/notifications/unread-count") public UnreadResponse unread() { return notifications.unread(); }
    @PostMapping("/notifications/{id}/read") @ResponseStatus(HttpStatus.NO_CONTENT) public void read(@PathVariable Long id) { notifications.markRead(id); }
    @PostMapping("/notifications/read-all") public CountResponse readAll() { return notifications.markAllRead(); }

    // customer feedback: staff and managers answer it
    @GetMapping("/feedback")
    public List<FeedbackResponse> feedback(@RequestParam(required = false) Boolean answered) { desk(); return feedback.list(answered); }
    @GetMapping("/feedback/waiting") public CountResponse feedbackWaiting() { desk(); return feedback.waiting(); }
    @PostMapping("/feedback/{id}/reply")
    public FeedbackResponse reply(@PathVariable Long id, @Valid @RequestBody FeedbackReplyRequest r) { desk(); return feedback.reply(id, r); }

    private static void desk() {
        if (!Caller.is(Role.STAFF, Role.MANAGER)) throw ApiException.forbidden("Chỉ nhân viên hoặc quản lý xem và trả lời góp ý");
    }

    @GetMapping("/kitchen/queue") public List<OrderResponse> kitchen() { return orders.kitchenQueue(); }

    @GetMapping("/menu") public List<MenuItemResponse> menu() { return catalog.menu(null, null, false); }

    @PatchMapping("/menu-items/{id}/availability")
    public MenuItemResponse availability(@PathVariable Long id, @Valid @RequestBody AvailabilityRequest r) { return catalog.setAvailability(id, r.available()); }

    @GetMapping("/store") public StoreResponse store() { return store.info(); }

    @PatchMapping("/store/accepting")
    public StoreResponse accepting(@Valid @RequestBody AcceptingRequest r) {
        if (!Caller.is(Role.STAFF, Role.MANAGER)) throw ApiException.forbidden("Chỉ nhân viên hoặc quản lý được bật/tắt nhận đơn");
        return store.setAccepting(r.acceptingOrders());
    }
}
