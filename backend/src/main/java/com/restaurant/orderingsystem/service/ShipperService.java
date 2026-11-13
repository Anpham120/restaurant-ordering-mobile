package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.DeliveryProofRepository;
import com.restaurant.orderingsystem.repository.OrderRepository;
import com.restaurant.orderingsystem.repository.UserRepository;
import com.restaurant.orderingsystem.security.AuthUser;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;

/**
 * The courier's part of the lifecycle: claim a READY order (→ DELIVERING), then confirm the hand-over with a photo
 * taken at the door (→ DELIVERED) or report a failed delivery with a reason (→ CANCELLED). Delivery is confirmed by the
 * shipper, not the customer, so an order never stays open because a customer forgot to tap "received".
 * Both outcomes are pushed to the store (staff + managers) as in-app notifications.
 */
@Service
@RequiredArgsConstructor
public class ShipperService {
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");

    private final OrderRepository orders;
    private final UserRepository users;
    private final DeliveryProofRepository proofs;
    private final OrderService orderService;
    private final OrderEvents events;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public ShipperBoard board() {
        long me = Caller.id();
        return new ShipperBoard(
                orders.findByStatusInOrderByCreatedAtAsc(List.of(OrderStatus.READY)).stream().map(orderService::toResponse).toList(),
                orders.findByStatusAndShipperIdOrderByUpdatedAtAsc(OrderStatus.DELIVERING, me).stream().map(orderService::toResponse).toList(),
                orders.findFinishedByShipperSince(me, List.of(OrderStatus.DELIVERED, OrderStatus.CANCELLED), LocalDate.now().atStartOfDay())
                        .stream().map(orderService::toResponse).toList());
    }

    /** A shipper sees orders waiting for a courier and the ones they took; other couriers' trips stay private. */
    @Transactional(readOnly = true)
    public OrderResponse get(Long id) {
        Order o = orderService.find(id);
        if (o.getStatus() != OrderStatus.READY && !mine(o)) throw ApiException.notFound("Không tìm thấy đơn hàng");
        return orderService.toResponse(o);
    }

    @Transactional
    public OrderResponse claim(Long id) {
        Order o = orderService.find(id);
        if (o.getStatus() != OrderStatus.READY)
            throw ApiException.conflict(o.getStatus() == OrderStatus.DELIVERING ? "Đơn đã có shipper khác nhận" : "Đơn chưa sẵn sàng để giao");
        AuthUser me = Caller.require();
        o.setShipper(users.getReferenceById(me.id()));
        events.change(o, OrderStatus.DELIVERING, null, me.id());
        orders.flush(); // two shippers tapping at once: the @Version check rejects the second one here
        return orderService.toResponse(o);
    }

    @Transactional
    public OrderResponse deliver(Long id, DeliverRequest r) {
        Order o = myTrip(id);
        Photo photo = Photo.decode(r.photo());
        DeliveryProof p = new DeliveryProof();
        p.setOrder(o);
        p.setPhoto(photo.bytes());
        p.setContentType(photo.contentType());
        p.setTakenAt(LocalDateTime.now());
        proofs.save(p);
        String note = CatalogService.blankToNull(r.note());
        events.change(o, OrderStatus.DELIVERED, note, o.getShipper().getId());
        Payment pay = o.getPayment();
        String cash = pay != null && pay.getMethod() == PaymentMethod.COD ? " Đã thu tiền mặt " + Money.vnd(OrderService.total(o)) + "." : "";
        notifications.toStore(o, "Giao thành công " + OrderService.code(o),
                "Shipper " + o.getShipper().getFullName() + " đã giao cho " + o.getRecipientName() + " lúc " + LocalDateTime.now().format(HM)
                        + ", có ảnh xác nhận." + cash + (note == null ? "" : " Ghi chú: " + note));
        return orderService.toResponse(o);
    }

    @Transactional
    public OrderResponse fail(Long id, FailRequest r) {
        Order o = myTrip(id);
        String reason = r.note().trim();
        events.change(o, OrderStatus.CANCELLED, reason, o.getShipper().getId());
        notifications.toStore(o, "Giao thất bại " + OrderService.code(o),
                "Shipper " + o.getShipper().getFullName() + " báo không giao được đơn cho " + o.getRecipientName() + ": " + reason);
        return orderService.toResponse(o);
    }

    /** The photo, for the store, the order's customer and the shipper who took it. */
    @Transactional(readOnly = true)
    public DeliveryProofResponse proof(Long orderId) {
        Order o = orderService.find(orderId);
        AuthUser me = Caller.require();
        boolean allowed = switch (me.role()) {
            case STAFF, KITCHEN, MANAGER -> true;
            case CUSTOMER -> o.getCustomer().getId().equals(me.id());
            case SHIPPER -> mine(o);
        };
        DeliveryProof p = allowed ? proofs.findById(orderId).orElse(null) : null;
        if (p == null) throw ApiException.notFound("Đơn này không có ảnh xác nhận giao hàng");
        String url = "data:" + p.getContentType() + ";base64," + Base64.getEncoder().encodeToString(p.getPhoto());
        return new DeliveryProofResponse(orderId, url, p.getTakenAt(), o.getShipper() == null ? null : o.getShipper().getFullName());
    }

    private boolean mine(Order o) { return o.getShipper() != null && o.getShipper().getId().equals(Caller.id()); }

    private Order myTrip(Long id) {
        Order o = orderService.find(id);
        if (!mine(o)) throw ApiException.forbidden("Đơn này không do bạn giao");
        if (o.getStatus() != OrderStatus.DELIVERING) throw ApiException.conflict("Đơn không còn ở trạng thái đang giao");
        return o;
    }

    /** A decoded upload; the type comes from the file's own first bytes, not from what the client claims. */
    record Photo(byte[] bytes, String contentType) {
        static Photo decode(String raw) {
            String b64 = raw.strip();
            int comma = b64.indexOf(',');
            if (b64.startsWith("data:") && comma > 0) b64 = b64.substring(comma + 1);
            byte[] bytes;
            try { bytes = Base64.getMimeDecoder().decode(b64); }
            catch (IllegalArgumentException e) { throw ApiException.badRequest("Ảnh xác nhận không hợp lệ"); }
            if (bytes.length == 0) throw ApiException.badRequest("Vui lòng chụp ảnh lúc giao hàng");
            if (bytes.length > DeliveryProof.MAX_BYTES) throw ApiException.badRequest("Ảnh quá lớn (tối đa 700 KB), vui lòng chụp lại");
            String type = sniff(bytes);
            if (type == null) throw ApiException.badRequest("Ảnh xác nhận phải là JPEG, PNG hoặc WebP");
            return new Photo(bytes, type);
        }

        static String sniff(byte[] b) {
            if (b.length > 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
            if (b.length > 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "image/png";
            if (b.length > 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F' && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
            return null;
        }
    }
}
