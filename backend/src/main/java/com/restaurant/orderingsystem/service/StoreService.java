package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.StoreSettings;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.StoreSettingsRepository;
import com.restaurant.orderingsystem.repository.UserRepository;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.restaurant.orderingsystem.entity.PaymentMethod;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
public class StoreService {
    private static final DateTimeFormatter HM = DateTimeFormatter.ofPattern("HH:mm");
    private final StoreSettingsRepository settings;
    private final UserRepository users;

    StoreSettings settings() {
        return settings.findById(StoreSettings.ID).orElseThrow(() -> new IllegalStateException("store_settings row is missing"));
    }

    /** Null when the store takes orders right now, otherwise the reason shown to the customer. */
    String closedReason(StoreSettings s) {
        if (!s.isAcceptingOrders()) return "Cửa hàng đang tạm ngưng nhận đơn, vui lòng quay lại sau";
        LocalTime now = LocalTime.now();
        if (now.isBefore(s.getOpenTime()) || !now.isBefore(s.getCloseTime()))
            return "Cửa hàng nhận đơn từ " + s.getOpenTime().format(HM) + " đến " + s.getCloseTime().format(HM);
        return null;
    }

    @Transactional(readOnly = true)
    public StoreResponse info() { return toResponse(settings()); }

    @Transactional
    public StoreResponse update(StoreSettingsRequest r) {
        if (!r.closeTime().isAfter(r.openTime())) throw ApiException.badRequest("Giờ đóng cửa phải sau giờ mở cửa");
        StoreSettings s = settings();
        s.setStoreName(r.storeName().trim());
        s.setHotline(r.hotline());
        s.setStoreAddress(r.storeAddress().trim());
        s.setOpenTime(r.openTime());
        s.setCloseTime(r.closeTime());
        s.setMinOrderAmount(r.minOrderAmount());
        s.setAcceptingOrders(r.acceptingOrders());
        String code = CatalogService.blankToNull(r.bankCode()), acc = CatalogService.blankToNull(r.bankAccount());
        if ((code == null) != (acc == null)) throw ApiException.badRequest("Nhập đủ cả ngân hàng và số tài khoản (hoặc bỏ trống cả hai để tắt chuyển khoản)");
        s.setBankCode(code);
        s.setBankAccount(acc);
        String holder = CatalogService.blankToNull(r.bankHolder());
        s.setBankHolder(holder == null ? null : java.text.Normalizer.normalize(holder, java.text.Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('đ', 'd').replace('Đ', 'D').toUpperCase(java.util.Locale.ROOT));
        if (r.transferTimeoutMinutes() != null) s.setTransferTimeoutMinutes(r.transferTimeoutMinutes());
        s.setUpdatedBy(users.getReferenceById(Caller.id()));
        return toResponse(s);
    }

    List<PaymentMethod> paymentMethods(StoreSettings s) {
        List<PaymentMethod> m = new ArrayList<>(List.of(PaymentMethod.COD));
        if (s.getBankAccount() != null) m.add(PaymentMethod.BANK_TRANSFER);
        return m;
    }

    @Transactional
    public StoreResponse setAccepting(boolean accepting) {
        StoreSettings s = settings();
        s.setAcceptingOrders(accepting);
        s.setUpdatedBy(users.getReferenceById(Caller.id()));
        return toResponse(s);
    }

    private StoreResponse toResponse(StoreSettings s) {
        String reason = closedReason(s);
        return new StoreResponse(s.getStoreName(), s.getHotline(), s.getStoreAddress(), s.getOpenTime(), s.getCloseTime(),
                s.getMinOrderAmount(), s.isAcceptingOrders(), reason == null, reason,
                paymentMethods(s), s.getBankCode(), s.getBankAccount(), s.getBankHolder(), s.getTransferTimeoutMinutes());
    }
}
