package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.DeliveryQuote;
import com.restaurant.orderingsystem.entity.StoreSettings;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Delivery pricing by distance, the way delivery apps do it: one base fee covers the first kilometres, every started
 * kilometre beyond adds a fixed amount, and a hard radius limits where the restaurant delivers at all.
 *
 *   distance  = straight-line distance x road factor (roads are longer than the crow flies), rounded up to 0.1 km
 *   fee       = base fee                                              when distance <= base radius
 *               base fee + ceil(distance - base radius) x extra/km    beyond it, rounded up to 1,000 d
 *   estimate  = kitchen minutes + travel minutes per km x distance
 *   delivered = distance <= maximum radius
 *
 * All numbers come from store_settings so the manager can tune them without a release.
 */
@Service
@RequiredArgsConstructor
public class DeliveryService {
    private static final double EARTH_RADIUS_KM = 6371.0088;
    private static final BigDecimal THOUSAND = BigDecimal.valueOf(1000);

    private final StoreService store;
    /** Straight-line to road distance; real routes in a dense city are typically 25-40 % longer. */
    @Value("${app.delivery.road-factor:1.3}") private double roadFactor;

    @Transactional(readOnly = true)
    public DeliveryQuote quote(BigDecimal latitude, BigDecimal longitude) { return quote(store.settings(), latitude, longitude); }

    DeliveryQuote quote(StoreSettings s, BigDecimal latitude, BigDecimal longitude) {
        if (latitude == null || longitude == null)
            return unavailable("Địa chỉ chưa có vị trí trên bản đồ, vui lòng cập nhật địa chỉ");
        if (s.getLatitude() == null || s.getLongitude() == null)
            return unavailable("Cửa hàng chưa thiết lập vị trí, vui lòng liên hệ cửa hàng");

        BigDecimal km = BigDecimal.valueOf(straightLineKm(s.getLatitude().doubleValue(), s.getLongitude().doubleValue(),
                latitude.doubleValue(), longitude.doubleValue()) * roadFactor).setScale(1, RoundingMode.UP);
        int minutes = s.getPrepMinutes() + km.multiply(BigDecimal.valueOf(s.getMinutesPerKm())).setScale(0, RoundingMode.UP).intValue();
        if (km.compareTo(s.getDeliveryMaxKm()) > 0) {
            return new DeliveryQuote(km, fee(s, km), minutes, false,
                    "Địa chỉ cách cửa hàng khoảng " + kmText(km) + " km, ngoài phạm vi giao tối đa " + kmText(s.getDeliveryMaxKm()) + " km");
        }
        return new DeliveryQuote(km, fee(s, km), minutes, true, null);
    }

    static BigDecimal fee(StoreSettings s, BigDecimal km) {
        BigDecimal fee = s.getDeliveryBaseFee();
        if (km.compareTo(s.getDeliveryBaseKm()) > 0) {
            BigDecimal extraKm = km.subtract(s.getDeliveryBaseKm()).setScale(0, RoundingMode.CEILING);
            fee = fee.add(extraKm.multiply(s.getDeliveryExtraFeePerKm()));
        }
        return fee.divide(THOUSAND, 0, RoundingMode.CEILING).multiply(THOUSAND).setScale(2, RoundingMode.UNNECESSARY);
    }

    /** Great-circle distance (haversine). */
    static double straightLineKm(double lat1, double lon1, double lat2, double lon2) {
        double dLat = Math.toRadians(lat2 - lat1), dLon = Math.toRadians(lon2 - lon1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
        return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
    }

    /** 15.0 -> "15", 8.3 -> "8,3" (Vietnamese decimal comma, no trailing zero). */
    static String kmText(BigDecimal v) {
        BigDecimal t = v.stripTrailingZeros();
        if (t.scale() < 0) t = t.setScale(0);
        return t.toPlainString().replace('.', ',');
    }

    private static DeliveryQuote unavailable(String reason) {
        return new DeliveryQuote(BigDecimal.ZERO.setScale(1), BigDecimal.ZERO.setScale(2), 0, false, reason);
    }
}
