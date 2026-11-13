package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.FeedbackRepository;
import com.restaurant.orderingsystem.repository.OrderRepository;
import com.restaurant.orderingsystem.repository.UserRepository;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Feedback from customers to the store. A new message rings the back-office bell (staff + managers); the reply comes
 * back to the customer as an in-app notification. Customers can also call or text the hotline from the same screen.
 */
@Service
@RequiredArgsConstructor
public class FeedbackService {
    /** Enough for a real complaint and a follow-up, not enough to flood the store. */
    static final int DAILY_LIMIT = 5;

    private final FeedbackRepository feedback;
    private final OrderRepository orders;
    private final UserRepository users;
    private final NotificationService notifications;

    @Transactional
    public FeedbackResponse send(FeedbackRequest r) {
        long me = Caller.id();
        if (feedback.countByCustomerIdAndCreatedAtAfter(me, LocalDateTime.now().minusDays(1)) >= DAILY_LIMIT)
            throw ApiException.badRequest("Bạn đã gửi " + DAILY_LIMIT + " góp ý trong 24 giờ qua. Nếu cần gấp, vui lòng gọi hotline của cửa hàng");
        Order order = null;
        if (r.orderId() != null) {
            order = orders.findById(r.orderId()).filter(o -> o.getCustomer().getId().equals(me))
                    .orElseThrow(() -> ApiException.notFound("Không tìm thấy đơn hàng"));
        }
        Feedback f = new Feedback();
        f.setCustomer(users.getReferenceById(me));
        f.setOrder(order);
        f.setTopic(r.topic());
        f.setMessage(r.message().strip());
        feedback.save(f);
        User c = users.findById(me).orElseThrow();
        notifications.toStore(NotificationType.FEEDBACK, order, "Góp ý mới từ " + c.getFullName(),
                topicLabel(r.topic()) + (order == null ? "" : " (đơn " + OrderService.code(order) + ")") + ": " + f.getMessage());
        return toResponse(f);
    }

    @Transactional(readOnly = true)
    public List<FeedbackResponse> mine() {
        return feedback.findByCustomerIdOrderByCreatedAtDesc(Caller.id(), PageRequest.of(0, 50)).stream().map(this::toResponse).toList();
    }

    /** @param answered null = all, false = waiting for a reply, true = answered; unanswered ones always come first */
    @Transactional(readOnly = true)
    public List<FeedbackResponse> list(Boolean answered) {
        var page = PageRequest.of(0, 100);
        List<Feedback> list = new java.util.ArrayList<>();
        if (!Boolean.TRUE.equals(answered)) list.addAll(feedback.findByReplyIsNullOrderByCreatedAtAsc(page));
        if (!Boolean.FALSE.equals(answered)) list.addAll(feedback.findByReplyIsNotNullOrderByRepliedAtDesc(page));
        return list.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public CountResponse waiting() { return new CountResponse(feedback.countByReplyIsNull()); }

    /** Answering again replaces the earlier answer; the customer is notified each time. */
    @Transactional
    public FeedbackResponse reply(Long id, FeedbackReplyRequest r) {
        Feedback f = feedback.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy góp ý"));
        f.setReply(r.reply().strip());
        f.setRepliedBy(users.getReferenceById(Caller.id()));
        f.setRepliedAt(LocalDateTime.now());
        notifications.toUser(f.getCustomer(), NotificationType.FEEDBACK, f.getOrder(), "Cửa hàng đã trả lời góp ý của bạn", f.getReply());
        return toResponse(f);
    }

    static String topicLabel(FeedbackTopic t) {
        return switch (t) {
            case ORDER -> "Đơn hàng";
            case FOOD -> "Món ăn";
            case DELIVERY -> "Giao hàng";
            case APP -> "Ứng dụng";
            case OTHER -> "Khác";
        };
    }

    private FeedbackResponse toResponse(Feedback f) {
        User c = f.getCustomer();
        Order o = f.getOrder();
        return new FeedbackResponse(f.getId(), f.getTopic(), o == null ? null : o.getId(), o == null ? null : OrderService.code(o), f.getMessage(), f.getCreatedAt(),
                f.getReply(), f.getRepliedBy() == null ? null : f.getRepliedBy().getFullName(), f.getRepliedAt(), c.getId(), c.getFullName(), c.getPhone());
    }
}
