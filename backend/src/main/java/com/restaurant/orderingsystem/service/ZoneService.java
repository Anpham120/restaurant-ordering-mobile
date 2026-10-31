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
public class ZoneService {
    private final DeliveryZoneRepository zones;
    private final AddressRepository addresses;
    private final OrderRepository orders;

    @Transactional(readOnly = true)
    public List<ZoneResponse> list(boolean includeInactive) {
        return (includeInactive ? zones.findAllByOrderBySortOrderAscNameAsc() : zones.findByActiveTrueOrderBySortOrderAscNameAsc())
                .stream().map(ZoneResponse::of).toList();
    }

    @Transactional
    public ZoneResponse create(ZoneRequest r) {
        if (zones.existsByNameIgnoreCase(r.name().trim())) throw ApiException.conflict("Khu vực đã tồn tại");
        return ZoneResponse.of(zones.save(apply(new DeliveryZone(), r)));
    }

    @Transactional
    public ZoneResponse update(Long id, ZoneRequest r) {
        if (zones.existsByNameIgnoreCaseAndIdNot(r.name().trim(), id)) throw ApiException.conflict("Khu vực đã tồn tại");
        return ZoneResponse.of(apply(zone(id), r));
    }

    @Transactional
    public void delete(Long id) {
        zone(id);
        if (orders.existsByZoneId(id) || addresses.existsByZoneId(id))
            throw ApiException.conflict("Khu vực đã có địa chỉ hoặc đơn hàng, hãy chọn \"Ngừng giao\" thay vì xóa");
        zones.deleteById(id);
    }

    DeliveryZone zone(Long id) { return zones.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy khu vực giao hàng")); }

    private static DeliveryZone apply(DeliveryZone z, ZoneRequest r) {
        z.setName(r.name().trim());
        z.setDeliveryFee(r.deliveryFee());
        z.setEstimatedMinutes(r.estimatedMinutes());
        z.setSortOrder(r.sortOrder());
        if (r.active() != null) z.setActive(r.active());
        return z;
    }
}
