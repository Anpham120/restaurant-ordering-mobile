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

/** The customer address book. The first address becomes the default; at most one default (also a DB index). */
@Service
@RequiredArgsConstructor
public class AddressService {
    static final int MAX_ADDRESSES = 10;
    private final AddressRepository addresses;
    private final UserRepository users;
    private final ZoneService zones;

    @Transactional(readOnly = true)
    public List<AddressResponse> list() {
        return addresses.findByUserIdOrderByDefaultAddressDescCreatedAtDesc(Caller.id()).stream().map(AddressResponse::of).toList();
    }

    @Transactional
    public AddressResponse create(AddressRequest r) {
        long uid = Caller.id();
        long count = addresses.countByUserId(uid);
        if (count >= MAX_ADDRESSES) throw ApiException.badRequest("Chỉ lưu được tối đa " + MAX_ADDRESSES + " địa chỉ");
        Address a = new Address();
        a.setUser(users.getReferenceById(uid));
        apply(a, r);
        if (r.makeDefault() || count == 0) {
            addresses.clearDefault(uid);
            a.setDefaultAddress(true);
        }
        return AddressResponse.of(addresses.save(a));
    }

    @Transactional
    public AddressResponse update(Long id, AddressRequest r) {
        Address a = own(id);
        apply(a, r);
        if (r.makeDefault() && !a.isDefaultAddress()) makeDefault(a);
        return AddressResponse.of(a);
    }

    @Transactional
    public AddressResponse setDefault(Long id) {
        Address a = own(id);
        if (!a.isDefaultAddress()) makeDefault(a);
        return AddressResponse.of(a);
    }

    /** Orders keep their own copy of the delivery address, so deleting never touches order history. */
    @Transactional
    public void delete(Long id) {
        Address a = own(id);
        boolean wasDefault = a.isDefaultAddress();
        addresses.delete(a);
        addresses.flush();
        if (wasDefault) {
            addresses.findByUserIdOrderByDefaultAddressDescCreatedAtDesc(Caller.id()).stream().findFirst()
                    .ifPresent(next -> next.setDefaultAddress(true));
        }
    }

    Address own(Long id) {
        return addresses.findByIdAndUserId(id, Caller.id()).orElseThrow(() -> ApiException.notFound("Không tìm thấy địa chỉ"));
    }

    private void makeDefault(Address a) {
        addresses.clearDefault(a.getUser().getId());
        addresses.flush();
        a.setDefaultAddress(true);
    }

    private void apply(Address a, AddressRequest r) {
        DeliveryZone z = zones.zone(r.zoneId());
        if (!z.isActive()) throw ApiException.badRequest("Cửa hàng chưa giao tới khu vực " + z.getName());
        a.setZone(z);
        a.setLabel(r.label().trim());
        a.setRecipientName(r.recipientName().trim());
        a.setRecipientPhone(r.recipientPhone());
        a.setStreet(r.street().trim());
        a.setNote(CatalogService.blankToNull(r.note()));
    }
}
