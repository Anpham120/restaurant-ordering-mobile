package com.restaurant.orderingsystem.config;

import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/** Demo data (menu, tables, demo accounts, voucher) on an empty DB. On when app.seed.demo=true; never in the "test" profile. */
@Component
@Profile("!test")
@org.springframework.boot.autoconfigure.condition.ConditionalOnProperty(name = "app.seed.demo", havingValue = "true")
@org.springframework.core.annotation.Order(1)
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {
    private final CategoryRepository categories;
    private final MenuItemRepository menuItems;
    private final RestaurantTableRepository tables;
    private final UserRepository users;
    private final VoucherRepository vouchers;
    private final PasswordEncoder encoder;

    @Override
    public void run(String... args) {
        if (categories.count() > 0) return;
        Category food = cat("Món chính", 1), drink = cat("Đồ uống", 2), dessert = cat("Tráng miệng", 3);
        item(food, "Phở bò", "Phở bò tái nạm", "55000");
        item(food, "Cơm sườn nướng", "Sườn nướng, trứng ốp la", "60000");
        item(food, "Bún chả", "Bún chả Hà Nội", "50000");
        item(drink, "Trà đá", "Miễn phí đá", "5000");
        item(drink, "Cà phê sữa", "Cà phê phin sữa đặc", "25000");
        item(drink, "Nước cam", "Cam vắt tươi", "30000");
        item(dessert, "Chè khúc bạch", "Khúc bạch, vải, hạnh nhân", "35000");
        for (int i = 1; i <= 5; i++) {
            RestaurantTable t = new RestaurantTable();
            t.setCode("T" + i); t.setSeats(i <= 3 ? 4 : 6);
            tables.save(t);
        }
        // Demo accounts with well-known passwords only when no account exists yet
        // (AdminBootstrap runs first, so a configured APP_ADMIN_PASSWORD suppresses them).
        if (users.count() == 0) {
            user("manager", "manager123", "Quản lý", Role.MANAGER);
            user("staff", "staff123", "Nhân viên A", Role.STAFF);
            user("kitchen", "kitchen123", "Bếp trưởng", Role.KITCHEN);
        }
        Voucher v = new Voucher();
        v.setCode("WELCOME10"); v.setDiscountType(DiscountType.PERCENT); v.setDiscountValue(BigDecimal.TEN);
        v.setMinOrder(new BigDecimal("50000")); v.setEndAt(LocalDateTime.now().plusYears(1));
        vouchers.save(v);
    }

    private Category cat(String n, int order) { Category c = new Category(); c.setName(n); c.setSortOrder(order); return categories.save(c); }
    private void item(Category c, String n, String d, String p) {
        MenuItem m = new MenuItem(); m.setCategory(c); m.setName(n); m.setDescription(d); m.setPrice(new BigDecimal(p)); menuItems.save(m);
    }
    private void user(String u, String pw, String name, Role r) {
        User x = new User(); x.setUsername(u); x.setPasswordHash(encoder.encode(pw)); x.setFullName(name); x.setRole(r); users.save(x);
    }
}
