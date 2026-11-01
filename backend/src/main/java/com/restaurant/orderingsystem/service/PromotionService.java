package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/** Restaurant campaigns shown as banners on the home screen; can be announced to all customers once. */
@Service
@RequiredArgsConstructor
public class PromotionService {
    private final PromotionRepository promotions;
    private final MenuItemRepository menuItems;
    private final CategoryRepository categories;
    private final VoucherRepository vouchers;
    private final NotificationRepository notificationRepo;
    private final NotificationService notifications;

    @Transactional(readOnly = true)
    public List<PromotionResponse> live() { return promotions.findLive(LocalDateTime.now()).stream().map(this::toResponse).toList(); }

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

    /** Sends the campaign to every active customer as an in-app notification (once per campaign). */
    @Transactional
    public CountResponse announce(Long id) {
        Promotion p = find(id);
        if (!live(p)) throw ApiException.badRequest("Chỉ gửi thông báo cho chương trình đang hiển thị");
        if (notificationRepo.existsByPromotionId(id)) throw ApiException.conflict("Chương trình này đã được gửi thông báo");
        return new CountResponse(notifications.broadcast(p));
    }

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
                p.getStartAt(), p.getEndAt(), p.getSortOrder(), p.isActive(), live(p), p.getId() != null && notificationRepo.existsByPromotionId(p.getId()));
    }
}
