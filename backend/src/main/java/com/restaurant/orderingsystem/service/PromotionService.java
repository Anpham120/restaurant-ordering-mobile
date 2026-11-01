package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * Restaurant campaigns shown as home-screen banners, built not to annoy:
 * <ul>
 *   <li>banners are filtered per customer – never a voucher they can no longer use, a sold-out dish or an empty category;
 *       at most {@value #MAX_BANNERS} banners;</li>
 *   <li>announcing sends at most one promotional notification per customer per {@code app.promotions.cap-hours} hours,
 *       skips customers who opted out, and is postponed to the morning when requested during quiet hours.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PromotionService {
    static final int MAX_BANNERS = 5;
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm dd/MM");

    private final PromotionRepository promotions;
    private final MenuItemRepository menuItems;
    private final CategoryRepository categories;
    private final VoucherRepository vouchers;
    private final OrderRepository orders;
    private final UserRepository users;
    private final NotificationRepository notificationRepo;
    private final NotificationService notifications;

    @Value("${app.promotions.quiet-start:21:00}") private LocalTime quietStart;
    @Value("${app.promotions.quiet-end:08:00}") private LocalTime quietEnd;
    @Value("${app.promotions.cap-hours:24}") private int capHours;

    // ---------------------------------------------------------------- banners
    @Transactional(readOnly = true)
    public List<PromotionResponse> live() {
        Long customer = Caller.user().filter(u -> u.role() == Role.CUSTOMER).map(u -> u.id()).orElse(null);
        return promotions.findLive(LocalDateTime.now()).stream().filter(p -> useful(p, customer)).limit(MAX_BANNERS).map(this::toResponse).toList();
    }

    /** A banner is worth showing only if what it advertises can be ordered or used right now (by this customer). */
    private boolean useful(Promotion p, Long customerId) {
        return switch (p.getTargetType()) {
            case NONE -> true;
            case MENU_ITEM -> p.getMenuItem().isActive() && p.getMenuItem().isAvailable();
            case CATEGORY -> menuItems.findMenu(false).stream()
                    .anyMatch(m -> m.getCategory().getId().equals(p.getCategory().getId()) && m.isAvailable());
            case VOUCHER -> {
                Voucher v = p.getVoucher();
                LocalDateTime now = LocalDateTime.now();
                boolean usable = v.isActive() && (v.getStartAt() == null || !v.getStartAt().isAfter(now)) && (v.getEndAt() == null || !v.getEndAt().isBefore(now))
                        && (v.getUsageLimit() == null || orders.countByVoucherIdAndStatusNot(v.getId(), OrderStatus.CANCELLED) < v.getUsageLimit());
                boolean usedUp = customerId != null && v.getPerUserLimit() != null
                        && orders.countByVoucherIdAndCustomerIdAndStatusNot(v.getId(), customerId, OrderStatus.CANCELLED) >= v.getPerUserLimit();
                yield usable && !usedUp;
            }
        };
    }

    @Transactional(readOnly = true)
    public List<PromotionResponse> all() { return promotions.findAllByOrderBySortOrderAscIdDesc().stream().map(this::toResponse).toList(); }

    @Transactional
    public PromotionResponse create(PromotionRequest r) { return toResponse(promotions.save(apply(new Promotion(), r))); }

    @Transactional
    public PromotionResponse update(Long id, PromotionRequest r) { return toResponse(apply(find(id), r)); }

    @Transactional
    public void delete(Long id) {
        Promotion p = find(id);
        notificationRepo.unlinkPromotion(id);   // notifications keep their text, only the link goes (also ON DELETE SET NULL in the DB)
        promotions.delete(p);
    }

    // ---------------------------------------------------------------- announcements
    /** Sends now, or – during quiet hours – schedules the announcement for the end of the quiet period. Once per campaign. */
    @Transactional
    public AnnounceResponse announce(Long id) {
        Promotion p = find(id);
        if (!live(p)) throw ApiException.badRequest("Chỉ gửi thông báo cho chương trình đang hiển thị");
        if (p.getAnnouncedAt() != null) throw ApiException.conflict("Chương trình này đã được gửi thông báo");
        if (p.getAnnounceAt() != null) throw ApiException.conflict("Chương trình đã được hẹn gửi lúc " + p.getAnnounceAt().format(HM));
        LocalDateTime now = LocalDateTime.now();
        if (quiet(now.toLocalTime())) {
            LocalDateTime at = now.toLocalTime().isBefore(quietEnd) ? now.toLocalDate().atTime(quietEnd) : now.toLocalDate().plusDays(1).atTime(quietEnd);
            p.setAnnounceAt(at);
            return new AnnounceResponse(0, 0, at, "Đang trong giờ yên lặng (" + quietStart + "–" + quietEnd + "), thông báo sẽ tự gửi lúc " + at.format(HM));
        }
        return send(p);
    }

    /** Sends announcements that were postponed by the quiet hours (runs every minute). */
    @Scheduled(fixedDelayString = "${app.promotions.check-ms:60000}", initialDelayString = "${app.promotions.check-ms:60000}")
    @Transactional
    public void sendScheduled() {
        if (quiet(LocalTime.now())) return;
        for (Promotion p : promotions.findByAnnounceAtLessThanEqualAndAnnouncedAtIsNull(LocalDateTime.now())) {
            if (live(p)) {
                AnnounceResponse r = send(p);
                log.info("Scheduled promotion {} announced: {} sent, {} skipped", p.getId(), r.sent(), r.skipped());
            } else {
                p.setAnnounceAt(null);   // campaign ended or was switched off meanwhile: drop the announcement
            }
        }
    }

    private AnnounceResponse send(Promotion p) {
        long audience = users.countByRoleAndActiveTrueAndMarketingOptInTrue(Role.CUSTOMER);
        int sent = notifications.broadcast(p, capHours);
        p.setAnnouncedAt(LocalDateTime.now());
        p.setAnnounceAt(null);
        long skipped = Math.max(0, audience - sent);
        return new AnnounceResponse(sent, skipped, null, "Đã gửi cho " + sent + " khách"
                + (skipped > 0 ? ", bỏ qua " + skipped + " khách đã nhận khuyến mãi trong " + capHours + " giờ qua" : ""));
    }

    boolean quiet(LocalTime t) {
        return quietStart.isAfter(quietEnd) ? (!t.isBefore(quietStart) || t.isBefore(quietEnd)) : (!t.isBefore(quietStart) && t.isBefore(quietEnd));
    }

    // ---------------------------------------------------------------- helpers
    private Promotion find(Long id) { return promotions.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy chương trình")); }

    private Promotion apply(Promotion p, PromotionRequest r) {
        if (r.startAt() != null && r.endAt() != null && !r.endAt().isAfter(r.startAt())) throw ApiException.badRequest("Ngày kết thúc phải sau ngày bắt đầu");
        p.setTitle(r.title().trim());
        p.setSubtitle(CatalogService.blankToNull(r.subtitle()));
        p.setImageUrl(r.imageUrl().trim());
        p.setTargetType(r.targetType());
        p.setMenuItem(null);
        p.setCategory(null);
        p.setVoucher(null);
        switch (r.targetType()) {
            case MENU_ITEM -> p.setMenuItem(menuItems.findById(required(r.menuItemId(), "món")).filter(MenuItem::isActive)
                    .orElseThrow(() -> ApiException.badRequest("Món không tồn tại hoặc đã ngừng bán")));
            case CATEGORY -> p.setCategory(categories.findById(required(r.categoryId(), "danh mục")).orElseThrow(() -> ApiException.badRequest("Danh mục không tồn tại")));
            case VOUCHER -> p.setVoucher(vouchers.findById(required(r.voucherId(), "mã giảm giá")).orElseThrow(() -> ApiException.badRequest("Mã giảm giá không tồn tại")));
            case NONE -> { }
        }
        p.setStartAt(r.startAt());
        p.setEndAt(r.endAt());
        p.setSortOrder(r.sortOrder());
        if (r.active() != null) p.setActive(r.active());
        return p;
    }

    private static Long required(Long id, String what) {
        if (id == null) throw ApiException.badRequest("Vui lòng chọn " + what + " cho chương trình");
        return id;
    }

    private static boolean live(Promotion p) {
        LocalDateTime now = LocalDateTime.now();
        return p.isActive() && (p.getStartAt() == null || !p.getStartAt().isAfter(now)) && (p.getEndAt() == null || !p.getEndAt().isBefore(now));
    }

    private PromotionResponse toResponse(Promotion p) {
        return new PromotionResponse(p.getId(), p.getTitle(), p.getSubtitle(), p.getImageUrl(), p.getTargetType(),
                p.getMenuItem() == null ? null : p.getMenuItem().getId(), p.getMenuItem() == null ? null : p.getMenuItem().getName(),
                p.getCategory() == null ? null : p.getCategory().getId(), p.getCategory() == null ? null : p.getCategory().getName(),
                p.getVoucher() == null ? null : p.getVoucher().getId(), p.getVoucher() == null ? null : p.getVoucher().getCode(),
                p.getStartAt(), p.getEndAt(), p.getSortOrder(), p.isActive(), live(p), p.getAnnouncedAt() != null,
                p.getAnnounceAt(), p.getAnnouncedAt());
    }
}
