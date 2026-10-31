package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.BadRequestException;
import com.restaurant.orderingsystem.exception.NotFoundException;
import com.restaurant.orderingsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ReviewService {
    private final ReviewRepository reviews;
    private final OrderRepository orders;

    @Transactional
    public ReviewResponse create(ReviewRequest req) {
        Order order = orders.findById(req.orderId()).orElseThrow(() -> new NotFoundException("Order not found"));
        if (order.getStatus() != OrderStatus.COMPLETED) throw new BadRequestException("Only paid orders can be reviewed");
        OrderItem item = order.getItems().stream()
                .filter(i -> i.getMenuItem().getId().equals(req.menuItemId()) && i.getStatus() != OrderItemStatus.CANCELLED)
                .findFirst().orElseThrow(() -> new BadRequestException("This item is not part of the order"));
        if (reviews.existsByOrderIdAndMenuItemId(order.getId(), req.menuItemId())) throw new BadRequestException("Item already reviewed for this order");
        Review r = new Review();
        r.setOrder(order);
        r.setMenuItem(item.getMenuItem());
        r.setRating(req.rating());
        r.setComment(req.comment());
        return ReviewResponse.of(reviews.save(r));
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse> forItem(Long menuItemId) {
        return reviews.findByMenuItemIdOrderByCreatedAtDesc(menuItemId).stream().map(ReviewResponse::of).toList();
    }
}
