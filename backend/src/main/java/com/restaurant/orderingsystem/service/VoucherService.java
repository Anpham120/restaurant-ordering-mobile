package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VoucherService {
    private final VoucherRepository vouchers;
    private final OrderRepository orders;
    private final PromotionRepository promotions;

    /** Result of checking a code against an order: either a discount or the reason it does not apply. */
    record Check(Voucher voucher, BigDecimal discount, String error) {}

    Check check(String code, BigDecimal subtotal, long customerId) {
        if (code == null || code.isBlank()) return new Check(null, Money.ZERO, null);
        Voucher v = vouchers.findByCodeIgnoreCase(code.trim()).filter(Voucher::isActive).orElse(null);
        if (v == null) return new Check(null, Money.ZERO, "Mã giảm giá không tồn tại");
        LocalDateTime now = LocalDateTime.now();
        if (v.getStartAt() != null && now.isBefore(v.getStartAt())) return new Check(null, Money.ZERO, "Mã giảm giá chưa đến thời gian áp dụng");
        if (v.getEndAt() != null && now.isAfter(v.getEndAt())) return new Check(null, Money.ZERO, "Mã giảm giá đã hết hạn");
        if (subtotal.compareTo(v.getMinOrder()) < 0)
            return new Check(null, Money.ZERO, "Đơn từ " + Money.vnd(v.getMinOrder()) + " mới dùng được mã này");
        if (v.getUsageLimit() != null && orders.countByVoucherIdAndStatusNot(v.getId(), OrderStatus.CANCELLED) >= v.getUsageLimit())
            return new Check(null, Money.ZERO, "Mã giảm giá đã hết lượt sử dụng");
        if (v.getPerUserLimit() != null && orders.countByVoucherIdAndCustomerIdAndStatusNot(v.getId(), customerId, OrderStatus.CANCELLED) >= v.getPerUserLimit())
            return new Check(null, Money.ZERO, "Bạn đã dùng hết lượt của mã này");
        BigDecimal discount = v.getDiscountType() == DiscountType.PERCENT
                ? subtotal.multiply(v.getDiscountValue()).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                : v.getDiscountValue();
        if (v.getMaxDiscount() != null) discount = discount.min(v.getMaxDiscount());
        return new Check(v, Money.of(discount.min(subtotal)), null);
    }

    /** Codes a customer can currently use (shown as offers in the app). */
    @Transactional(readOnly = true)
    public List<VoucherResponse> usable() {
        return vouchers.findUsable(LocalDateTime.now()).stream()
                .filter(v -> v.getUsageLimit() == null || orders.countByVoucherIdAndStatusNot(v.getId(), OrderStatus.CANCELLED) < v.getUsageLimit())
                .map(v -> toResponse(v, false)).toList();
    }

    @Transactional(readOnly = true)
    public List<VoucherResponse> all() { return vouchers.findAllByOrderByCreatedAtDesc().stream().map(v -> toResponse(v, true)).toList(); }

    @Transactional
    public VoucherResponse create(VoucherRequest r) {
        if (vouchers.existsByCodeIgnoreCase(r.code())) throw ApiException.conflict("Mã giảm giá đã tồn tại");
        return toResponse(vouchers.save(apply(new Voucher(), r)), true);
    }

    @Transactional
    public VoucherResponse update(Long id, VoucherRequest r) {
        if (vouchers.existsByCodeIgnoreCaseAndIdNot(r.code(), id)) throw ApiException.conflict("Mã giảm giá đã tồn tại");
        return toResponse(apply(voucher(id), r), true);
    }

    @Transactional
    public void delete(Long id) {
        voucher(id);
        if (orders.existsByVoucherId(id)) throw ApiException.conflict("Mã đã được dùng trong đơn hàng, hãy chọn \"Ngừng áp dụng\" thay vì xóa");
        if (promotions.existsByVoucherId(id)) throw ApiException.conflict("Mã đang được dùng trong chương trình quảng bá");
        vouchers.deleteById(id);
    }

    private Voucher voucher(Long id) { return vouchers.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy mã giảm giá")); }

    private static Voucher apply(Voucher v, VoucherRequest r) {
        if (r.discountType() == DiscountType.PERCENT && r.discountValue().compareTo(BigDecimal.valueOf(100)) > 0)
            throw ApiException.badRequest("Giảm theo % không được vượt quá 100");
        if (r.startAt() != null && r.endAt() != null && !r.endAt().isAfter(r.startAt()))
            throw ApiException.badRequest("Ngày kết thúc phải sau ngày bắt đầu");
        v.setCode(r.code().trim().toUpperCase(Locale.ROOT));
        v.setDescription(CatalogService.blankToNull(r.description()));
        v.setDiscountType(r.discountType());
        v.setDiscountValue(r.discountValue());
        v.setMaxDiscount(r.discountType() == DiscountType.PERCENT ? r.maxDiscount() : null);
        v.setMinOrder(r.minOrder() == null ? BigDecimal.ZERO : r.minOrder());
        v.setStartAt(r.startAt());
        v.setEndAt(r.endAt());
        v.setUsageLimit(r.usageLimit());
        v.setPerUserLimit(r.perUserLimit());
        if (r.active() != null) v.setActive(r.active());
        return v;
    }

    private VoucherResponse toResponse(Voucher v, boolean withUsage) {
        long used = withUsage ? orders.countByVoucherIdAndStatusNot(v.getId(), OrderStatus.CANCELLED) : 0;
        return new VoucherResponse(v.getId(), v.getCode(), v.getDescription(), v.getDiscountType(), v.getDiscountValue(), v.getMaxDiscount(),
                v.getMinOrder(), v.getStartAt(), v.getEndAt(), v.getUsageLimit(), v.getPerUserLimit(), v.isActive(), used);
    }
}
