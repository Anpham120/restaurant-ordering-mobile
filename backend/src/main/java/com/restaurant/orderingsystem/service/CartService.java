package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.*;
import com.restaurant.orderingsystem.security.Caller;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Server-side cart. A line is a dish + a set of options; adding the same dish with the same options and note merges lines.
 * Lines whose dish or option became unavailable stay visible but flagged, so the customer can fix them before ordering.
 */
@Service
@RequiredArgsConstructor
public class CartService {
    static final int MAX_LINES = 30;
    private final CartItemRepository cart;
    private final UserRepository users;
    private final CatalogService catalog;

    @Transactional(readOnly = true)
    public CartResponse get() { return view(cart.findForUser(Caller.id())); }

    @Transactional
    public CartResponse add(AddToCartRequest r) {
        long uid = Caller.id();
        MenuItem m = catalog.item(r.menuItemId());
        if (!m.isActive()) throw ApiException.badRequest("Món không còn trong thực đơn");
        if (!m.isAvailable()) throw ApiException.badRequest("Món \"" + m.getName() + "\" tạm hết, vui lòng chọn món khác");
        Set<MenuOption> chosen = validateOptions(m, r.optionIds() == null ? List.of() : r.optionIds());
        String note = CatalogService.blankToNull(r.note());
        Set<Long> chosenIds = ids(chosen);
        List<CartItem> lines = cart.findForUser(uid);
        CartItem line = lines.stream().filter(l -> l.getMenuItem().getId().equals(m.getId()) && ids(l.getOptions()).equals(chosenIds)
                && Objects.equals(l.getNote(), note)).findFirst().orElse(null);
        if (line == null) {
            if (lines.size() >= MAX_LINES) throw ApiException.badRequest("Giỏ hàng tối đa " + MAX_LINES + " dòng món");
            line = new CartItem();
            line.setUser(users.getReferenceById(uid));
            line.setMenuItem(m);
            line.setOptions(new HashSet<>(chosen));
            line.setNote(note);
        }
        int qty = line.getQuantity() + r.quantity();
        if (qty > 99) throw ApiException.badRequest("Mỗi món tối đa 99 phần");
        line.setQuantity(qty);
        cart.save(line);
        cart.flush();
        return get();
    }

    /** Changes quantity or note of one line; quantity 0 removes it. */
    @Transactional
    public CartResponse update(Long lineId, CartLineRequest r) {
        CartItem line = cart.findByIdAndUserId(lineId, Caller.id()).orElseThrow(() -> ApiException.notFound("Không tìm thấy món trong giỏ"));
        if (r.quantity() == 0) cart.delete(line);
        else {
            line.setQuantity(r.quantity());
            line.setNote(CatalogService.blankToNull(r.note()));
        }
        cart.flush();
        return get();
    }

    @Transactional
    public CartResponse clear() {
        cart.clear(Caller.id());
        return new CartResponse(List.of(), 0, Money.ZERO, false);
    }

    /** Adds the dishes of a past order to the cart with the same options; unavailable dishes/options are skipped. */
    @Transactional
    public CartResponse addAll(List<OrderItem> items) {
        for (OrderItem i : items) {
            MenuItem m = i.getMenuItem();
            if (!m.isActive() || !m.isAvailable()) continue;
            List<Long> opts = i.getOptions().stream().map(o -> o.getOption().getId()).toList();
            try {
                validateOptions(m, opts);
                add(new AddToCartRequest(m.getId(), Math.min(i.getQuantity(), 99), i.getNote(), opts));
            } catch (ApiException e) {
                // option no longer offered or quantity limit: skip this dish
            }
        }
        return get();
    }

    /** Checks the chosen options against the dish's groups (availability, min/max per group). */
    Set<MenuOption> validateOptions(MenuItem m, List<Long> optionIds) {
        Set<Long> wanted = new HashSet<>(optionIds);
        Map<Long, MenuOption> byId = m.getOptionGroups().stream().flatMap(g -> g.getOptions().stream())
                .collect(Collectors.toMap(MenuOption::getId, o -> o));
        Set<MenuOption> chosen = new HashSet<>();
        for (Long id : wanted) {
            MenuOption o = byId.get(id);
            if (o == null) throw ApiException.badRequest("Tùy chọn không thuộc món này");
            if (!o.isAvailable()) throw ApiException.badRequest("Tùy chọn \"" + o.getName() + "\" tạm hết");
            chosen.add(o);
        }
        for (OptionGroup g : m.getOptionGroups()) {
            long n = chosen.stream().filter(o -> o.getGroup().getId().equals(g.getId())).count();
            if (n < g.getMinSelect()) throw ApiException.badRequest("Vui lòng chọn " + g.getName().toLowerCase(Locale.ROOT));
            if (n > g.getMaxSelect()) throw ApiException.badRequest("\"" + g.getName() + "\" chọn tối đa " + g.getMaxSelect());
        }
        return chosen;
    }

    List<CartItem> lines(long userId) { return cart.findForUser(userId); }

    void clear(long userId) { cart.clear(userId); }

    private static Set<Long> ids(Set<MenuOption> s) { return s.stream().map(MenuOption::getId).collect(Collectors.toSet()); }

    /** Problem that prevents ordering this line, or null. */
    static String problem(CartItem c) {
        MenuItem m = c.getMenuItem();
        if (!m.isActive()) return "Món đã ngừng bán";
        if (!m.isAvailable()) return "Món tạm hết";
        for (MenuOption o : c.getOptions()) if (!o.isAvailable()) return "Tùy chọn \"" + o.getName() + "\" tạm hết";
        for (OptionGroup g : m.getOptionGroups()) {
            long n = c.getOptions().stream().filter(o -> o.getGroup().getId().equals(g.getId())).count();
            if (n < g.getMinSelect() || n > g.getMaxSelect()) return "Tùy chọn của món đã thay đổi, vui lòng chọn lại";
        }
        return null;
    }

    static BigDecimal unitPrice(CartItem c) {
        return c.getOptions().stream().map(MenuOption::getPriceDelta).reduce(c.getMenuItem().getPrice(), BigDecimal::add);
    }

    static CartResponse view(List<CartItem> items) {
        List<CartLine> lines = new ArrayList<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        int count = 0;
        boolean problems = false;
        for (CartItem c : items) {
            MenuItem m = c.getMenuItem();
            String problem = problem(c);
            BigDecimal unit = unitPrice(c);
            BigDecimal line = unit.multiply(BigDecimal.valueOf(c.getQuantity()));
            if (problem == null) { subtotal = subtotal.add(line); count += c.getQuantity(); } else problems = true;
            List<ChosenOption> chosen = c.getOptions().stream()
                    .sorted(Comparator.comparingInt((MenuOption o) -> o.getGroup().getSortOrder()).thenComparingInt(MenuOption::getSortOrder))
                    .map(o -> new ChosenOption(o.getId(), o.getGroup().getName(), o.getName(), o.getPriceDelta())).toList();
            lines.add(new CartLine(c.getId(), m.getId(), m.getName(), m.getImageUrl(), m.getPrice(), chosen, Money.of(unit), c.getQuantity(),
                    c.getNote(), Money.of(line), problem == null, problem));
        }
        return new CartResponse(lines, count, Money.of(subtotal), problems);
    }
}
