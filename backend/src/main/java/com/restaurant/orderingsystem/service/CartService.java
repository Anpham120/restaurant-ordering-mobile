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

/** Server-side cart. Lines whose dish was archived or sold out stay visible but flagged, so the customer can fix them. */
@Service
@RequiredArgsConstructor
public class CartService {
    static final int MAX_LINES = 30;
    private final CartItemRepository cart;
    private final UserRepository users;
    private final CatalogService catalog;

    @Transactional(readOnly = true)
    public CartResponse get() { return view(cart.findForUser(Caller.id())); }

    /** Set the quantity of one dish (0 removes it). */
    @Transactional
    public CartResponse put(Long menuItemId, CartItemRequest r) {
        long uid = Caller.id();
        UserMenuItemKey key = new UserMenuItemKey(uid, menuItemId);
        if (r.quantity() == 0) {
            cart.deleteById(key);
            cart.flush();
            return get();
        }
        MenuItem m = catalog.item(menuItemId);
        if (!m.isActive()) throw ApiException.badRequest("Món không còn trong thực đơn");
        if (!m.isAvailable()) throw ApiException.badRequest("Món \"" + m.getName() + "\" tạm hết, vui lòng chọn món khác");
        CartItem line = cart.findById(key).orElse(null);
        if (line == null) {
            if (cart.findForUser(uid).size() >= MAX_LINES) throw ApiException.badRequest("Giỏ hàng tối đa " + MAX_LINES + " món khác nhau");
            line = new CartItem();
            line.setId(key);
            line.setUser(users.getReferenceById(uid));
            line.setMenuItem(m);
        }
        line.setQuantity(r.quantity());
        line.setNote(CatalogService.blankToNull(r.note()));
        cart.save(line);
        cart.flush();
        return get();
    }

    @Transactional
    public CartResponse clear() {
        cart.clear(Caller.id());
        return new CartResponse(List.of(), 0, Money.ZERO, false);
    }

    /** Adds the dishes of a past order to the cart (merging quantities); unavailable dishes are skipped. */
    @Transactional
    public CartResponse addAll(List<OrderItem> items) {
        long uid = Caller.id();
        for (OrderItem i : items) {
            MenuItem m = i.getMenuItem();
            if (!m.isActive() || !m.isAvailable()) continue;
            UserMenuItemKey key = new UserMenuItemKey(uid, m.getId());
            CartItem line = cart.findById(key).orElseGet(() -> {
                CartItem n = new CartItem();
                n.setId(key);
                n.setUser(users.getReferenceById(uid));
                n.setMenuItem(m);
                return n;
            });
            line.setQuantity(Math.min(99, line.getQuantity() + i.getQuantity()));
            if (line.getNote() == null) line.setNote(i.getNote());
            cart.save(line);
        }
        cart.flush();
        return get();
    }

    List<CartItem> lines(long userId) { return cart.findForUser(userId); }

    void clear(long userId) { cart.clear(userId); }

    static CartResponse view(List<CartItem> items) {
        List<CartLine> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int count = 0;
        boolean problems = false;
        for (CartItem c : items) {
            MenuItem m = c.getMenuItem();
            String problem = !m.isActive() ? "Món đã ngừng bán" : !m.isAvailable() ? "Món tạm hết" : null;
            BigDecimal line = m.getPrice().multiply(BigDecimal.valueOf(c.getQuantity()));
            if (problem == null) { subtotal = subtotal.add(line); count += c.getQuantity(); } else problems = true;
            lines.add(new CartLine(m.getId(), m.getName(), m.getImageUrl(), m.getPrice(), c.getQuantity(), c.getNote(), Money.of(line), problem == null, problem));
        }
        return new CartResponse(lines, count, Money.of(subtotal), problems);
    }
}
