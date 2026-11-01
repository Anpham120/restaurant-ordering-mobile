package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

/** Revenue = what customers paid on delivery (items − discount + delivery fee), dated by the delivery time. */
@Service
@RequiredArgsConstructor
public class ReportService {
    private final OrderRepository orders;
    private final OrderStatusHistoryRepository history;
    private final ReviewRepository reviews;
    private final UserRepository users;
    private final OrderService orderService;
    private final StoreService store;
    private final PaymentRepository payments;

    private record Delivered(Order order, LocalDateTime at) {}

    private List<Delivered> delivered(LocalDate from, LocalDate to) {
        List<Order> list = orders.findReachedStatusBetween(OrderStatus.DELIVERED, from.atStartOfDay(), to.plusDays(1).atStartOfDay());
        if (list.isEmpty()) return List.of();
        Map<Long, LocalDateTime> at = history.findByOrdersAndStatus(list.stream().map(Order::getId).toList(), OrderStatus.DELIVERED).stream()
                .collect(Collectors.toMap(h -> h.getOrder().getId(), OrderStatusHistory::getChangedAt, (a, b) -> a));
        return list.stream().filter(o -> o.getStatus() == OrderStatus.DELIVERED).map(o -> new Delivered(o, at.get(o.getId()))).toList();
    }

    /** Delivered revenue is grouped by how far the order travelled. */
    private static final String[] BANDS = {"Dưới 3 km", "3 – 5 km", "5 – 10 km", "Trên 10 km"};
    private static int band(java.math.BigDecimal km) {
        double d = km.doubleValue();
        return d <= 3 ? 0 : d <= 5 ? 1 : d <= 10 ? 2 : 3;
    }

    @Transactional(readOnly = true)
    public RevenueReport revenue(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) throw ApiException.badRequest("Ngày kết thúc phải sau ngày bắt đầu");
        if (from.plusDays(366).isBefore(to)) throw ApiException.badRequest("Chỉ xem báo cáo tối đa 1 năm mỗi lần");
        List<Delivered> list = delivered(from, to);
        BigDecimal revenue = sum(list);
        long cancelled = orders.findReachedStatusBetween(OrderStatus.CANCELLED, from.atStartOfDay(), to.plusDays(1).atStartOfDay()).size();
        Map<Integer, List<Delivered>> byBand = list.stream().collect(Collectors.groupingBy(d -> band(d.order().getDistanceKm()), TreeMap::new, Collectors.toList()));
        return new RevenueReport(from, to, revenue, list.size(), cancelled, avg(revenue, list.size()), daily(list, from, to), top(list, 10),
                byBand.entrySet().stream().map(e -> new DistanceRevenue(BANDS[e.getKey()], sum(e.getValue()), e.getValue().size())).toList());
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard() {
        LocalDate today = LocalDate.now();
        List<Delivered> week = delivered(today.minusDays(6), today);
        List<Delivered> todayList = week.stream().filter(d -> d.at().toLocalDate().equals(today)).toList();
        List<Delivered> yesterday = delivered(today.minusDays(1), today.minusDays(1));
        BigDecimal revenueToday = sum(todayList);
        long cancelledToday = orders.findReachedStatusBetween(OrderStatus.CANCELLED, today.atStartOfDay(), today.plusDays(1).atStartOfDay()).size();
        Object[] rating = reviews.ratingSince(today.minusDays(6).atStartOfDay()).stream().findFirst().orElse(new Object[]{null, 0L});
        Double avgRating = rating[0] == null ? null : Math.round(((Number) rating[0]).doubleValue() * 10) / 10.0;
        long newCustomers = users.count((root, q, cb) -> cb.and(cb.equal(root.get("role"), Role.CUSTOMER),
                cb.greaterThanOrEqualTo(root.get("createdAt"), today.atStartOfDay())));
        List<OrderResponse> recent = orderService.search(null, null, null, 0, 8, false).content();
        return new DashboardResponse(revenueToday, sum(yesterday), todayList.size(), cancelledToday,
                orders.countByStatusIn(List.of(OrderStatus.PENDING)), orders.countByStatusIn(OrderService.ACTIVE),
                orders.countByStatusIn(List.of(OrderStatus.AWAITING_PAYMENT)), payments.countByStatus(PaymentStatus.REFUND_PENDING),
                avg(revenueToday, todayList.size()), avgRating, rating[1] == null ? 0 : ((Number) rating[1]).longValue(), newCustomers,
                store.settings().isAcceptingOrders(), daily(week, today.minusDays(6), today), top(todayList, 5), recent);
    }

    private static BigDecimal sum(List<Delivered> list) {
        return Money.of(list.stream().map(d -> OrderService.total(d.order())).reduce(BigDecimal.ZERO, BigDecimal::add));
    }

    private static BigDecimal avg(BigDecimal total, int count) {
        return count == 0 ? Money.ZERO : total.divide(BigDecimal.valueOf(count), 0, RoundingMode.HALF_UP).setScale(2, RoundingMode.HALF_UP);
    }

    private static List<DailyRevenue> daily(List<Delivered> list, LocalDate from, LocalDate to) {
        Map<LocalDate, List<Delivered>> byDay = list.stream().collect(Collectors.groupingBy(d -> d.at().toLocalDate()));
        List<DailyRevenue> out = new ArrayList<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            List<Delivered> l = byDay.getOrDefault(d, List.of());
            out.add(new DailyRevenue(d, sum(l), l.size()));
        }
        return out;
    }

    private static List<TopItem> top(List<Delivered> list, int limit) {
        Map<Long, TopItem> acc = new HashMap<>();
        for (Delivered d : list) {
            for (OrderItem i : d.order().getItems()) {
                MenuItem m = i.getMenuItem();
                BigDecimal line = OrderService.lineTotal(i);
                acc.merge(m.getId(), new TopItem(m.getId(), m.getName(), m.getImageUrl(), i.getQuantity(), line),
                        (a, b) -> new TopItem(a.menuItemId(), a.name(), a.imageUrl(), a.quantity() + b.quantity(), a.revenue().add(b.revenue())));
            }
        }
        return acc.values().stream().sorted(Comparator.comparingLong(TopItem::quantity).reversed()).limit(limit)
                .map(t -> new TopItem(t.menuItemId(), t.name(), t.imageUrl(), t.quantity(), Money.of(t.revenue()))).toList();
    }
}
