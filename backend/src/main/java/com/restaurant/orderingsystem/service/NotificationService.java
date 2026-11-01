package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.NotificationRepository;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/** In-app notifications for customers: order progress, payments and restaurant promotions. */
@Service
@RequiredArgsConstructor
public class NotificationService {
    private final NotificationRepository notifications;

    void toCustomer(Order o, NotificationType type, String title, String body) {
        Notification n = new Notification();
        n.setUser(o.getCustomer());
        n.setType(type);
        n.setTitle(title);
        n.setBody(body);
        n.setOrder(o);
        notifications.save(n);
    }

    /** Message sent to the customer when their order moves to {@code status}; null = no notification. */
    void orderStatus(Order o, OrderStatus status, String reason) {
        String code = OrderService.code(o);
        String[] msg = switch (status) {
            case PENDING -> o.getPayment() != null && o.getPayment().getMethod() == PaymentMethod.BANK_TRANSFER
                    ? new String[]{"Đã nhận thanh toán", "Đơn " + code + " đã được thanh toán, đang chờ cửa hàng xác nhận."} : null;
            case CONFIRMED -> new String[]{"Cửa hàng đã xác nhận đơn", "Đơn " + code + " đã được xác nhận và sẽ sớm được chuẩn bị."};
            case PREPARING -> new String[]{"Bếp đang chuẩn bị món", "Đơn " + code + " đang được chế biến."};
            case DELIVERING -> new String[]{"Đơn hàng đang được giao", "Shipper của cửa hàng đang giao đơn " + code + " đến bạn."};
            case DELIVERED -> new String[]{"Giao hàng thành công", "Đơn " + code + " đã giao. Chúc bạn ngon miệng! Hãy đánh giá món để cửa hàng phục vụ tốt hơn."};
            case CANCELLED -> new String[]{"Đơn hàng đã bị hủy", "Đơn " + code + " đã hủy" + (reason == null ? "." : ": " + reason)};
            default -> null;
        };
        if (msg != null) toCustomer(o, status == OrderStatus.PENDING ? NotificationType.PAYMENT : NotificationType.ORDER, msg[0], msg[1]);
    }

    /** Frequency cap: a customer receives at most one promotional notification per {@code capHours}; opted-out customers none. */
    int broadcast(Promotion p, int capHours) {
        String body = p.getSubtitle() == null ? "Xem chi tiết chương trình trong ứng dụng." : p.getSubtitle();
        return notifications.broadcastPromotion(p.getTitle(), body, p.getId(), java.time.LocalDateTime.now().minusHours(capHours));
    }

    private static final java.util.List<NotificationType> ORDER_TYPES = java.util.List.of(NotificationType.ORDER, NotificationType.PAYMENT);
    private static final java.util.List<NotificationType> PROMO_TYPES = java.util.List.of(NotificationType.PROMOTION);

    /** @param category null = all, "ORDER" = order + payment, "PROMOTION" = promotions */
    @Transactional(readOnly = true)
    public List<NotificationResponse> mine(int limit, String category) {
        var page = PageRequest.of(0, Math.min(Math.max(limit, 1), 100));
        List<Notification> list = category == null || category.isBlank() ? notifications.findForUser(Caller.id(), page)
                : notifications.findForUserByTypes(Caller.id(), "PROMOTION".equalsIgnoreCase(category) ? PROMO_TYPES : ORDER_TYPES, page);
        return list.stream()
                .map(n -> new NotificationResponse(n.getId(), n.getType(), n.getTitle(), n.getBody(),
                        n.getOrder() == null ? null : n.getOrder().getId(), n.getPromotion() == null ? null : n.getPromotion().getId(),
                        n.isRead(), n.getCreatedAt())).toList();
    }

    @Transactional(readOnly = true)
    public UnreadResponse unread() {
        long uid = Caller.id();
        return new UnreadResponse(notifications.countByUserIdAndReadFalseAndTypeIn(uid, ORDER_TYPES),
                notifications.countByUserIdAndReadFalseAndTypeIn(uid, PROMO_TYPES));
    }

    @Transactional
    public void markRead(Long id) {
        notifications.findByIdAndUserId(id, Caller.id()).orElseThrow(() -> ApiException.notFound("Không tìm thấy thông báo")).setRead(true);
    }

    @Transactional
    public CountResponse markAllRead() { return new CountResponse(notifications.markAllRead(Caller.id())); }
}
