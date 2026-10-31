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

@Service
@RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepository reviews;
    private final OrderItemRepository orderItems;

    /** A customer rates a dish of one of their own delivered orders, once, within 7 days of delivery. */
    @Transactional
    public ReviewResponse create(ReviewRequest r) {
        OrderItem item = orderItems.findById(r.orderItemId()).orElseThrow(() -> ApiException.notFound("Không tìm thấy món trong đơn"));
        Order o = item.getOrder();
        if (!o.getCustomer().getId().equals(Caller.id())) throw ApiException.notFound("Không tìm thấy món trong đơn");
        if (o.getStatus() != OrderStatus.DELIVERED) throw ApiException.badRequest("Chỉ đánh giá được sau khi nhận hàng");
        LocalDateTime deliveredAt = o.getHistory().stream().filter(h -> h.getStatus() == OrderStatus.DELIVERED)
                .map(OrderStatusHistory::getChangedAt).findFirst().orElse(o.getUpdatedAt());
        if (deliveredAt.isBefore(LocalDateTime.now().minusDays(OrderService.REVIEW_DAYS)))
            throw ApiException.badRequest("Đã quá " + OrderService.REVIEW_DAYS + " ngày kể từ khi nhận hàng");
        if (reviews.existsByOrderItemId(item.getId())) throw ApiException.conflict("Bạn đã đánh giá món này");
        Review rv = new Review();
        rv.setOrderItem(item);
        rv.setRating(r.rating());
        rv.setComment(CatalogService.blankToNull(r.comment()));
        return toResponse(reviews.save(rv));
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> latest(int limit) {
        return reviews.findLatest(PageRequest.of(0, Math.min(Math.max(limit, 1), 200))).stream().map(ReviewService::toResponse).toList();
    }

    static ReviewResponse toResponse(Review r) {
        OrderItem i = r.getOrderItem();
        return new ReviewResponse(r.getId(), i.getId(), i.getOrder().getId(), i.getMenuItem().getId(), i.getMenuItem().getName(),
                i.getOrder().getCustomer().getFullName(), r.getRating(), r.getComment(), r.getCreatedAt());
    }
}
