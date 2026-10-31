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

/** Categories and dishes. Dishes that were ever ordered are archived (is_active = false), never deleted. */
@Service
@RequiredArgsConstructor
public class CatalogService {
    private final CategoryRepository categories;
    private final MenuItemRepository menuItems;
    private final OrderItemRepository orderItems;
    private final ReviewRepository reviews;
    private final FavoriteRepository favorites;

    @Transactional(readOnly = true)
    public List<CategoryResponse> categories(boolean includeArchivedItems) {
        Map<Long, Long> counts = new HashMap<>();
        menuItems.findMenu(includeArchivedItems).forEach(m -> counts.merge(m.getCategory().getId(), 1L, Long::sum));
        return categories.findAllByOrderBySortOrderAscNameAsc().stream()
                .map(c -> new CategoryResponse(c.getId(), c.getName(), c.getImageUrl(), c.getSortOrder(), counts.getOrDefault(c.getId(), 0L))).toList();
    }

    /** Menu with ratings, sold counts and the callers favorites. Archived dishes only for the admin view. */
    @Transactional(readOnly = true)
    public List<MenuItemResponse> menu(Long categoryId, String q, boolean includeArchived) {
        Stats st = stats();
        String needle = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        return menuItems.findMenu(includeArchived).stream()
                .filter(m -> categoryId == null || m.getCategory().getId().equals(categoryId))
                .filter(m -> needle.isEmpty() || m.getName().toLowerCase(Locale.ROOT).contains(needle)
                        || (m.getDescription() != null && m.getDescription().toLowerCase(Locale.ROOT).contains(needle)))
                .map(m -> toResponse(m, st)).toList();
    }

    /** Best sellers (delivered quantity), then best rated, among dishes on the menu. */
    @Transactional(readOnly = true)
    public List<MenuItemResponse> popular(int limit) {
        Stats st = stats();
        return menuItems.findMenu(false).stream().map(m -> toResponse(m, st))
                .sorted(Comparator.comparingLong(MenuItemResponse::soldCount).reversed()
                        .thenComparing(r -> r.ratingAvg() == null ? 0 : r.ratingAvg(), Comparator.reverseOrder()))
                .limit(Math.min(Math.max(limit, 1), 20)).toList();
    }

    @Transactional(readOnly = true)
    public MenuItemDetail detail(Long id) {
        MenuItem m = item(id);
        if (!m.isActive() && !Caller.is(Role.MANAGER)) throw ApiException.notFound("Món không còn trong thực đơn");
        List<ReviewResponse> recent = reviews.findForMenuItem(id, PageRequest.of(0, 10)).stream().map(ReviewService::toResponse).toList();
        return new MenuItemDetail(toResponse(m, stats()), recent);
    }

    @Transactional
    public CategoryResponse createCategory(CategoryRequest r) {
        if (categories.existsByNameIgnoreCase(r.name().trim())) throw ApiException.conflict("Danh mục đã tồn tại");
        Category c = new Category();
        apply(c, r);
        c = categories.save(c);
        return new CategoryResponse(c.getId(), c.getName(), c.getImageUrl(), c.getSortOrder(), 0);
    }

    @Transactional
    public CategoryResponse updateCategory(Long id, CategoryRequest r) {
        Category c = category(id);
        if (categories.existsByNameIgnoreCaseAndIdNot(r.name().trim(), id)) throw ApiException.conflict("Danh mục đã tồn tại");
        apply(c, r);
        return new CategoryResponse(c.getId(), c.getName(), c.getImageUrl(), c.getSortOrder(), menuItems.countByCategoryId(id));
    }

    @Transactional
    public void deleteCategory(Long id) {
        category(id);
        if (menuItems.countByCategoryId(id) > 0) throw ApiException.conflict("Danh mục còn món ăn, hãy chuyển các món sang danh mục khác trước");
        categories.deleteById(id);
    }

    @Transactional
    public MenuItemResponse createItem(MenuItemRequest r) {
        if (menuItems.existsByNameIgnoreCase(r.name().trim())) throw ApiException.conflict("Đã có món cùng tên");
        return toResponse(menuItems.save(apply(new MenuItem(), r)), stats());
    }

    @Transactional
    public MenuItemResponse updateItem(Long id, MenuItemRequest r) {
        if (menuItems.existsByNameIgnoreCaseAndIdNot(r.name().trim(), id)) throw ApiException.conflict("Đã có món cùng tên");
        return toResponse(apply(item(id), r), stats());
    }

    @Transactional
    public void deleteItem(Long id) {
        item(id);
        if (orderItems.existsByMenuItemId(id)) throw ApiException.conflict("Món đã có trong đơn hàng, hãy chọn \"Ngừng bán\" thay vì xóa");
        menuItems.deleteById(id);
    }

    @Transactional
    public MenuItemResponse setAvailability(Long id, boolean available) {
        MenuItem m = item(id);
        if (!m.isActive()) throw ApiException.badRequest("Món đã ngừng bán");
        m.setAvailable(available);
        return toResponse(m, stats());
    }

    MenuItem item(Long id) { return menuItems.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy món")); }

    private Category category(Long id) { return categories.findById(id).orElseThrow(() -> ApiException.notFound("Không tìm thấy danh mục")); }

    private static void apply(Category c, CategoryRequest r) {
        c.setName(r.name().trim());
        c.setImageUrl(blankToNull(r.imageUrl()));
        c.setSortOrder(r.sortOrder());
    }

    private MenuItem apply(MenuItem m, MenuItemRequest r) {
        m.setCategory(category(r.categoryId()));
        m.setName(r.name().trim());
        m.setDescription(blankToNull(r.description()));
        m.setPrice(r.price());
        m.setImageUrl(blankToNull(r.imageUrl()));
        if (r.available() != null) m.setAvailable(r.available());
        if (r.active() != null) m.setActive(r.active());
        return m;
    }

    record Stats(Map<Long, Object[]> ratings, Map<Long, Long> sold, Set<Long> favorites) {}

    Stats stats() {
        Map<Long, Object[]> ratings = new HashMap<>();
        reviews.ratingByMenuItem().forEach(r -> ratings.put((Long) r[0], r));
        Map<Long, Long> sold = new HashMap<>();
        orderItems.soldQuantities(OrderStatus.DELIVERED).forEach(r -> sold.put((Long) r[0], ((Number) r[1]).longValue()));
        Set<Long> fav = Caller.user().filter(u -> u.role() == Role.CUSTOMER).map(u -> favorites.favoriteIds(u.id())).orElse(Set.of());
        return new Stats(ratings, sold, fav);
    }

    static MenuItemResponse toResponse(MenuItem m, Stats st) {
        Object[] r = st.ratings().get(m.getId());
        Double avg = r == null ? null : Math.round(((Number) r[1]).doubleValue() * 10) / 10.0;
        long count = r == null ? 0 : ((Number) r[2]).longValue();
        return new MenuItemResponse(m.getId(), m.getCategory().getId(), m.getCategory().getName(), m.getName(), m.getDescription(),
                m.getPrice(), m.getImageUrl(), m.isAvailable(), m.isActive(), avg, count, st.sold().getOrDefault(m.getId(), 0L),
                st.favorites().contains(m.getId()));
    }

    static String blankToNull(String s) { return s == null || s.isBlank() ? null : s.trim(); }
}
