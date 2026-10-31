package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.BadRequestException;
import com.restaurant.orderingsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReportService {
    private final OrderRepository orders;
    private final OrderItemRepository orderItems;

    @Transactional(readOnly = true)
    public RevenueReport revenue(LocalDate from, LocalDate to) {
        if (to.isBefore(from)) throw new BadRequestException("'to' must not be before 'from'");
        LocalDateTime f = from.atStartOfDay(), t = to.plusDays(1).atStartOfDay().minusNanos(1);
        List<Order> done = orders.findByStatusAndUpdatedAtBetween(OrderStatus.COMPLETED, f, t);
        Map<LocalDate, List<Order>> byDay = done.stream().collect(Collectors.groupingBy(o -> o.getUpdatedAt().toLocalDate(), TreeMap::new, Collectors.toList()));
        List<DailyRevenue> daily = byDay.entrySet().stream().map(e -> new DailyRevenue(e.getKey(),
                e.getValue().stream().map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add), e.getValue().size())).toList();
        BigDecimal total = done.stream().map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<TopItem> top = orderItems.topItems(OrderStatus.COMPLETED, OrderItemStatus.CANCELLED, f, t, PageRequest.of(0, 5)).stream()
                .map(r -> new TopItem((Long) r[0], (String) r[1], ((Number) r[2]).longValue())).toList();
        return new RevenueReport(from, to, total, done.size(), daily, top);
    }
}
