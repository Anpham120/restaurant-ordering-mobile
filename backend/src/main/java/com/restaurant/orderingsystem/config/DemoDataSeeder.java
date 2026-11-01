package com.restaurant.orderingsystem.config;

import com.restaurant.orderingsystem.entity.*;
import com.restaurant.orderingsystem.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Profile;

import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Sample menu (photos from Wikimedia Commons, free licences), delivery zones and vouchers on an empty database.
 * Demo accounts and a few past orders are added only when no manager was configured (local development).
 */
@Slf4j
@Component
@org.springframework.core.annotation.Order(1)
@Profile("!test")
@ConditionalOnProperty(name = "app.seed.demo", havingValue = "true")
@RequiredArgsConstructor
public class DemoDataSeeder implements CommandLineRunner {
    private static final String W = "https://upload.wikimedia.org/wikipedia/commons/thumb/";
    private final CategoryRepository categories;
    private final MenuItemRepository menuItems;
    private final DeliveryZoneRepository zones;
    private final VoucherRepository vouchers;
    private final UserRepository users;
    private final AddressRepository addresses;
    private final OrderRepository orders;
    private final ReviewRepository reviews;
    private final StoreSettingsRepository settings;
    private final PromotionRepository promotions;
    private final PasswordEncoder encoder;

    @Override
    @Transactional
    public void run(String... args) {
        if (menuItems.count() > 0) return;
        Map<String, DeliveryZone> z = new HashMap<>();
        Object[][] zoneRows = {{"Quận 1", 15000, 25}, {"Quận 3", 15000, 30}, {"Quận 4", 20000, 30}, {"Quận 5", 20000, 35},
                {"Quận 10", 20000, 35}, {"Phú Nhuận", 20000, 35}, {"Bình Thạnh", 22000, 40}, {"Quận 7", 25000, 45}};
        for (int i = 0; i < zoneRows.length; i++) {
            DeliveryZone d = new DeliveryZone();
            d.setName((String) zoneRows[i][0]);
            d.setDeliveryFee(BigDecimal.valueOf((Integer) zoneRows[i][1]));
            d.setEstimatedMinutes((Integer) zoneRows[i][2]);
            d.setSortOrder(i);
            z.put(d.getName(), zones.save(d));
        }

        Category pho = cat("Phở & Bún", 1, W + "5/52/Bowl_of_Meatball_pho.jpg/500px-Bowl_of_Meatball_pho.jpg");
        Category rice = cat("Cơm", 2, W + "b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg/500px-C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg");
        Category rolls = cat("Món cuốn & Bánh", 3, W + "1/1a/Homemade_spring_rolls_%287010969349%29.jpg/500px-Homemade_spring_rolls_%287010969349%29.jpg");
        Category drinks = cat("Đồ uống", 4, W + "b/b7/Viet-coffee.jpg/500px-Viet-coffee.jpg");
        Category dessert = cat("Tráng miệng", 5, W + "5/58/Cremecaramel.jpg/500px-Cremecaramel.jpg");

        Map<String, MenuItem> m = new HashMap<>();
        put(m, pho, "Phở bò tái nạm", "Nước dùng hầm xương ống 12 giờ cùng quế, hồi, thảo quả; thịt bò tái mềm, nạm giòn, bánh phở tươi. Kèm rau thơm, giá, chanh.", 65000, "5/52/Bowl_of_Meatball_pho.jpg/500px-Bowl_of_Meatball_pho.jpg");
        put(m, pho, "Bún chả Hà Nội", "Chả viên và chả miếng nướng than hoa, nước mắm chua ngọt, bún tươi, rau sống.", 60000, "4/4d/B%C3%BAn_ch%E1%BA%A3_Vietnamese_food.jpg/500px-B%C3%BAn_ch%E1%BA%A3_Vietnamese_food.jpg");
        put(m, pho, "Bún bò Huế", "Giò heo, chả cua, bò bắp, nước dùng sả ớt đậm vị cố đô.", 65000, "0/04/B%C3%BAn_b%C3%B2_Hu%E1%BA%BF_-_Ch%E1%BB%A3_%C4%90%C3%B4ng_Ba_%282024%29_-_img_02.jpg/500px-B%C3%BAn_b%C3%B2_Hu%E1%BA%BF_-_Ch%E1%BB%A3_%C4%90%C3%B4ng_Ba_%282024%29_-_img_02.jpg");
        put(m, pho, "Mì Quảng gà", "Mì vàng, gà ta, trứng cút, đậu phộng rang, bánh tráng mè.", 60000, "5/57/M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg/500px-M%C3%AC_Qu%E1%BA%A3ng%2C_Da_Nang%2C_Vietnam.jpg");
        put(m, pho, "Hủ tiếu Nam Vang", "Tôm, thịt bằm, gan, trứng cút; nước dùng ngọt thanh từ xương.", 55000, "2/2a/Hu_Tieu_Nam_Vang.jpg/500px-Hu_Tieu_Nam_Vang.jpg");
        put(m, pho, "Cao lầu Hội An", "Sợi cao lầu dai, thịt xíu, tóp mỡ giòn, rau Trà Quế.", 60000, "4/4e/Cao_l%E1%BA%A7u_H%E1%BB%99i_An_%282024%29.jpg/500px-Cao_l%E1%BA%A7u_H%E1%BB%99i_An_%282024%29.jpg");
        put(m, rice, "Cơm tấm sườn bì chả", "Sườn nướng mật ong, bì, chả trứng, mỡ hành, nước mắm kẹo.", 55000, "b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg/500px-C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg");
        put(m, rice, "Cơm chiên hải sản", "Cơm chiên tôm, mực, trứng, rau củ, dùng kèm dưa leo.", 60000, "c/c3/Koh_Mak%2C_Thailand%2C_Fried_rice_with_seafood%2C_Thai_fried_rice.jpg/500px-Koh_Mak%2C_Thailand%2C_Fried_rice_with_seafood%2C_Thai_fried_rice.jpg");
        put(m, rolls, "Gỏi cuốn tôm thịt", "4 cuốn tôm, thịt ba chỉ, bún, rau thơm; kèm tương đậu phộng.", 45000, "1/1a/Homemade_spring_rolls_%287010969349%29.jpg/500px-Homemade_spring_rolls_%287010969349%29.jpg");
        put(m, rolls, "Chả giò", "6 cuốn chả giò giòn rụm nhân thịt, nấm mèo, khoai môn.", 50000, "6/6b/Cha_gio.jpg/500px-Cha_gio.jpg");
        put(m, rolls, "Bánh xèo miền Tây", "Vỏ giòn nghệ cốt dừa, nhân tôm thịt giá; cuốn cải xanh chấm nước mắm.", 60000, "5/59/Banh_Xeo_with_fish_sauce_and_vegetables.jpg/500px-Banh_Xeo_with_fish_sauce_and_vegetables.jpg");
        put(m, rolls, "Bánh mì thịt nướng", "Bánh mì giòn, thịt nướng, pate, đồ chua, rau mùi.", 30000, "0/0c/B%C3%A1nh_m%C3%AC_th%E1%BB%8Bt_n%C6%B0%E1%BB%9Bng.png/500px-B%C3%A1nh_m%C3%AC_th%E1%BB%8Bt_n%C6%B0%E1%BB%9Bng.png");
        put(m, rolls, "Bánh cuốn Thanh Trì", "Bánh cuốn mỏng, chả lụa, hành phi, nước mắm pha.", 45000, "b/b2/B%C3%A1nh_cu%E1%BB%91n_Thanh_Tr%C3%AC.jpg/500px-B%C3%A1nh_cu%E1%BB%91n_Thanh_Tr%C3%AC.jpg");
        put(m, drinks, "Cà phê sữa đá", "Cà phê phin Robusta Buôn Ma Thuột, sữa đặc.", 29000, "b/b7/Viet-coffee.jpg/500px-Viet-coffee.jpg");
        put(m, drinks, "Trà sữa trân châu", "Trà đen, sữa tươi, trân châu đường đen.", 35000, "a/a2/Bubble_Tea.png/500px-Bubble_Tea.png");
        put(m, drinks, "Nước mía", "Mía ép tươi, thêm tắc.", 20000, "6/63/Sugarcanejuice.jpg/500px-Sugarcanejuice.jpg");
        put(m, drinks, "Nước cam ép", "Cam sành vắt tươi, không đường.", 35000, "0/05/Orangejuice.jpg/500px-Orangejuice.jpg");
        put(m, dessert, "Chè xoài", "Xoài cát, nước cốt dừa, bột báng.", 30000, "2/2a/Ch%C3%A8_xo%C3%A0i.jpg/500px-Ch%C3%A8_xo%C3%A0i.jpg");
        put(m, dessert, "Bánh flan", "Bánh flan trứng gà, caramel, cà phê.", 25000, "5/58/Cremecaramel.jpg/500px-Cremecaramel.jpg");

        // options (size, topping…)
        String[][] bowl = {{"Tô thường", "0"}, {"Tô lớn", "15000"}};
        group(m.get("Phở bò tái nạm"), "Size", 1, 1, bowl);
        group(m.get("Phở bò tái nạm"), "Thêm", 0, 3, new String[][]{{"Trứng chần", "5000"}, {"Thêm thịt bò", "20000"}, {"Quẩy", "5000"}});
        group(m.get("Bún bò Huế"), "Size", 1, 1, bowl);
        group(m.get("Bún bò Huế"), "Thêm", 0, 2, new String[][]{{"Chả cua", "10000"}, {"Giò heo", "15000"}});
        group(m.get("Hủ tiếu Nam Vang"), "Size", 1, 1, bowl);
        group(m.get("Cơm tấm sườn bì chả"), "Thêm", 0, 3, new String[][]{{"Trứng ốp la", "7000"}, {"Thêm sườn", "25000"}, {"Thêm cơm", "5000"}});
        group(m.get("Bánh mì thịt nướng"), "Thêm", 0, 2, new String[][]{{"Thêm trứng", "5000"}, {"Thêm pate", "3000"}});
        group(m.get("Trà sữa trân châu"), "Size", 1, 1, new String[][]{{"M", "0"}, {"L", "6000"}});
        group(m.get("Trà sữa trân châu"), "Mức đường", 1, 1, new String[][]{{"100% đường", "0"}, {"70% đường", "0"}, {"50% đường", "0"}});
        group(m.get("Trà sữa trân châu"), "Topping", 0, 3, new String[][]{{"Trân châu trắng", "5000"}, {"Thạch phô mai", "8000"}, {"Pudding", "7000"}});
        group(m.get("Cà phê sữa đá"), "Đá", 1, 1, new String[][]{{"Nhiều đá", "0"}, {"Ít đá", "0"}, {"Đá riêng", "0"}});

        Voucher welcome = voucher("WELCOME10", "Giảm 10% đơn đầu tiên, tối đa 30.000đ", DiscountType.PERCENT, 10, 30000, 100000, null, 1);
        Voucher freeship = voucher("FREESHIP", "Giảm 20.000đ cho đơn từ 200.000đ", DiscountType.AMOUNT, 20000, null, 200000, null, null);
        promo("Giảm 10% đơn đầu tiên", "Nhập mã WELCOME10 – tối đa 30.000đ cho đơn từ 100.000đ", "5/52/Bowl_of_Meatball_pho.jpg/500px-Bowl_of_Meatball_pho.jpg", 1, p -> { p.setTargetType(PromotionTarget.VOUCHER); p.setVoucher(welcome); });
        promo("Món mới: Cao lầu Hội An", "Sợi cao lầu dai, thịt xíu, rau Trà Quế – chỉ 60.000đ", "4/4e/Cao_l%E1%BA%A7u_H%E1%BB%99i_An_%282024%29.jpg/500px-Cao_l%E1%BA%A7u_H%E1%BB%99i_An_%282024%29.jpg", 2, p -> { p.setTargetType(PromotionTarget.MENU_ITEM); p.setMenuItem(m.get("Cao lầu Hội An")); });
        promo("Giảm 20.000đ đơn từ 200.000đ", "Rủ cả nhà cùng đặt – nhập mã FREESHIP", "b/b0/C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg/500px-C%C6%A1m_T%E1%BA%A5m%2C_Da_Nang%2C_Vietnam.jpg", 3, p -> { p.setTargetType(PromotionTarget.VOUCHER); p.setVoucher(freeship); });
        promo("Giải nhiệt mùa hè", "Trà sữa, nước mía, nước cam ép – mát lạnh giao tận nơi", "a/a2/Bubble_Tea.png/500px-Bubble_Tea.png", 4, p -> { p.setTargetType(PromotionTarget.CATEGORY); p.setCategory(drinks); });

        if (users.count() == 0) demoAccounts(z, m);
        log.info("Demo data loaded: {} dishes, {} delivery zones", m.size(), z.size());
    }

    private void demoAccounts(Map<String, DeliveryZone> z, Map<String, MenuItem> m) {
        // local development: take orders around the clock so the app can be tried at any hour
        // demo receiving account (not a real one) so the VietQR transfer flow can be tried locally
        settings.findById(StoreSettings.ID).ifPresent(s -> {
            s.setOpenTime(java.time.LocalTime.MIN); s.setCloseTime(java.time.LocalTime.of(23, 59, 59));
            s.setBankCode("MB"); s.setBankAccount("0000000000"); s.setBankHolder("ATLAS RESTAURANT DEMO");
        });
        user("Quản lý Atlas", "0900000001", Role.MANAGER);
        User staff = user("Trần Thị Bình", "0900000002", Role.STAFF);
        user("Lê Văn Bếp", "0900000003", Role.KITCHEN);
        User an = user("Nguyễn Văn An", "0900000004", Role.CUSTOMER);
        Address a = new Address();
        a.setUser(an); a.setZone(z.get("Quận 1")); a.setLabel("Nhà riêng"); a.setRecipientName(an.getFullName());
        a.setRecipientPhone(an.getPhone()); a.setStreet("12 Nguyễn Huệ, P. Bến Nghé"); a.setDefaultAddress(true);
        addresses.save(a);
        // two delivered orders from earlier days, so ratings, best sellers and reports have data
        pastOrder(an, staff, a, 3, List.of(new Object[]{m.get("Phở bò tái nạm"), 2, 5}, new Object[]{m.get("Gỏi cuốn tôm thịt"), 1, 4}));
        pastOrder(an, staff, a, 1, List.of(new Object[]{m.get("Cơm tấm sườn bì chả"), 1, 5}, new Object[]{m.get("Cà phê sữa đá"), 2, null}));
    }

    private void pastOrder(User customer, User staff, Address a, int daysAgo, List<Object[]> lines) {
        LocalDateTime t = LocalDateTime.now().minusDays(daysAgo).withHour(12).withMinute(5);
        Order o = new Order();
        o.setCustomer(customer); o.setZone(a.getZone()); o.setRecipientName(a.getRecipientName()); o.setRecipientPhone(a.getRecipientPhone());
        o.setDeliveryStreet(a.getStreet()); o.setDeliveryFee(a.getZone().getDeliveryFee()); o.setStatus(OrderStatus.DELIVERED);
        o.setCreatedAt(t); o.setUpdatedAt(t.plusMinutes(38));
        for (Object[] l : lines) {
            OrderItem i = new OrderItem();
            i.setOrder(o); i.setMenuItem((MenuItem) l[0]); i.setQuantity((Integer) l[1]); i.setUnitPrice(((MenuItem) l[0]).getPrice());
            o.getItems().add(i);
        }
        OrderStatus[] steps = {OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PREPARING, OrderStatus.READY, OrderStatus.DELIVERING, OrderStatus.DELIVERED};
        int[] minutes = {0, 2, 5, 18, 20, 38};
        for (int s = 0; s < steps.length; s++) {
            OrderStatusHistory h = new OrderStatusHistory();
            h.setOrder(o); h.setStatus(steps[s]); h.setChangedAt(t.plusMinutes(minutes[s]));
            h.setChangedBy(s == 0 ? customer : staff);
            o.getHistory().add(h);
        }
        Payment pay = new Payment();
        pay.setOrder(o); pay.setMethod(PaymentMethod.COD); pay.setStatus(PaymentStatus.PAID);
        pay.setAmount(lines.stream().map(l -> ((MenuItem) l[0]).getPrice().multiply(BigDecimal.valueOf((Integer) l[1]))).reduce(BigDecimal.ZERO, BigDecimal::add).add(o.getDeliveryFee()));
        pay.setPaidAt(t.plusMinutes(38)); pay.setConfirmedBy(staff);
        o.setPayment(pay);
        o = orders.save(o);
        orders.flush();
        for (int k = 0; k < lines.size(); k++) {
            Integer rating = (Integer) lines.get(k)[2];
            if (rating == null) continue;
            Review r = new Review();
            r.setOrderItem(o.getItems().get(k)); r.setRating(rating);
            r.setComment(rating == 5 ? "Ngon, giao nhanh, đồ ăn còn nóng." : "Ổn, lần sau cho thêm rau nhé.");
            reviews.save(r);
        }
    }

    private Category cat(String name, int order, String img) {
        Category c = new Category();
        c.setName(name); c.setSortOrder(order); c.setImageUrl(img);
        return categories.save(c);
    }

    private void put(Map<String, MenuItem> map, Category c, String name, String desc, int price, String img) {
        MenuItem i = new MenuItem();
        i.setCategory(c); i.setName(name); i.setDescription(desc); i.setPrice(BigDecimal.valueOf(price)); i.setImageUrl(W + img);
        map.put(name, menuItems.save(i));
    }

    private void group(MenuItem item, String name, int min, int max, String[][] opts) {
        OptionGroup g = new OptionGroup();
        g.setMenuItem(item); g.setName(name); g.setMinSelect(min); g.setMaxSelect(max); g.setSortOrder(item.getOptionGroups().size());
        for (int i = 0; i < opts.length; i++) {
            MenuOption o = new MenuOption();
            o.setGroup(g); o.setName(opts[i][0]); o.setPriceDelta(new BigDecimal(opts[i][1])); o.setSortOrder(i);
            g.getOptions().add(o);
        }
        item.getOptionGroups().add(g);
        menuItems.save(item);
    }

    private void promo(String title, String subtitle, String img, int order, java.util.function.Consumer<Promotion> target) {
        Promotion p = new Promotion();
        p.setTitle(title); p.setSubtitle(subtitle); p.setImageUrl(W + img); p.setSortOrder(order); p.setEndAt(LocalDateTime.now().plusYears(1));
        target.accept(p);
        promotions.save(p);
    }

    private Voucher voucher(String code, String desc, DiscountType type, int value, Integer max, int min, Integer limit, Integer perUser) {
        Voucher v = new Voucher();
        v.setCode(code); v.setDescription(desc); v.setDiscountType(type); v.setDiscountValue(BigDecimal.valueOf(value));
        v.setMaxDiscount(max == null ? null : BigDecimal.valueOf(max)); v.setMinOrder(BigDecimal.valueOf(min));
        v.setUsageLimit(limit); v.setPerUserLimit(perUser); v.setEndAt(LocalDateTime.now().plusYears(1));
        return vouchers.save(v);
    }

    private User user(String name, String phone, Role role) {
        User u = new User();
        u.setFullName(name); u.setPhone(phone); u.setRole(role); u.setPasswordHash(encoder.encode("Atlas@123"));
        return users.save(u);
    }
}
