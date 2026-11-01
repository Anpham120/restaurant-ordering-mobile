package com.restaurant.orderingsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.restaurant.orderingsystem.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class DeliveryFlowTest extends ApiTestBase {

    @Test
    void healthAndPublicMenu() throws Exception {
        as(null, get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        as(null, get("/api/store")).andExpect(jsonPath("$.openNow").value(true));
        as(null, get("/api/menu")).andExpect(jsonPath("$[?(@.id==" + pho + ")]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.id==" + archived + ")]").isEmpty());
        as(null, get("/api/menu").param("categoryId", String.valueOf(categoryId))).andExpect(jsonPath("$", hasSize(2)));
        as(null, get("/api/menu").param("q", "pho")).andExpect(jsonPath("$[*].name", everyItem(containsStringIgnoringCase("pho"))));
        as(null, get("/api/menu/" + archived)).andExpect(status().isNotFound());
        as(null, get("/api/zones")).andExpect(jsonPath("$[?(@.id==" + zoneId + ")]").isNotEmpty());
    }

    @Test
    void registerLoginProfileAndPassword() throws Exception {
        String p = phone();
        send(post("/api/auth/register"), "{\"fullName\":\"Lan\",\"phone\":\"" + p + "\",\"email\":\"Lan" + uniq() + "@Mail.com\",\"password\":\"Passw0rd!\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.user.role").value("CUSTOMER")).andExpect(jsonPath("$.user.passwordHash").doesNotExist());
        send(post("/api/auth/register"), "{\"fullName\":\"Lan\",\"phone\":\"" + p + "\",\"password\":\"Passw0rd!\"}").andExpect(status().isConflict());
        send(post("/api/auth/register"), "{\"fullName\":\"X\",\"phone\":\"123\",\"password\":\"short\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("password")));
        String t = login(p, "Passw0rd!");
        as(t, get("/api/auth/me")).andExpect(jsonPath("$.phone").value(p));
        as(t, put("/api/auth/profile"), "{\"fullName\":\"Lan Nguyễn\",\"email\":\"\"}").andExpect(jsonPath("$.fullName").value("Lan Nguyễn"));
        as(t, post("/api/auth/change-password"), "{\"currentPassword\":\"wrong\",\"newPassword\":\"NewPassw0rd\"}").andExpect(status().isBadRequest());
        as(t, post("/api/auth/change-password"), "{\"currentPassword\":\"Passw0rd!\",\"newPassword\":\"NewPassw0rd\"}").andExpect(status().isNoContent());
        login(p, "NewPassw0rd");
        // 5 wrong attempts lock this login for 10 minutes
        for (int i = 0; i < 5; i++) send(post("/api/auth/login"), "{\"login\":\"" + p + "\",\"password\":\"bad\"}").andExpect(status().isUnauthorized());
        send(post("/api/auth/login"), "{\"login\":\"" + p + "\",\"password\":\"NewPassw0rd\"}").andExpect(status().isTooManyRequests());
    }

    @Test
    void fullDeliveryFlowWithTimelineReviewAndReports() throws Exception {
        long addr = address(customer);
        cart(customer, pho, 2).andExpect(jsonPath("$.subtotal").value(130000.0));
        as(customer, post("/api/me/cart/items"), "{\"menuItemId\":" + tea + ",\"quantity\":1,\"note\":\"ít đá\"}").andExpect(jsonPath("$.itemCount").value(3));
        as(customer, post("/api/me/checkout/preview"), "{\"addressId\":" + addr + "}").andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(150000.0)).andExpect(jsonPath("$.deliveryFee").value(15000.0))
                .andExpect(jsonPath("$.total").value(165000.0)).andExpect(jsonPath("$.canPlace").value(true));
        JsonNode order = json(as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + ",\"note\":\"Gọi trước khi giao\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.code", matchesPattern("DH\\d{6}-\\d{4,}"))).andExpect(jsonPath("$.cancellable").value(true)));
        long id = order.get("id").asLong();
        as(customer, get("/api/me/cart")).andExpect(jsonPath("$.lines", hasSize(0)));

        as(staff, get("/api/manage/orders").param("status", "PENDING").param("sort", "oldest")).andExpect(jsonPath("$.content[?(@.id==" + id + ")]").isNotEmpty());
        as(staff, get("/api/manage/orders").param("q", order.get("code").asText())).andExpect(jsonPath("$.content[0].id").value(id));
        deliver(id);
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.status").value("DELIVERED")).andExpect(jsonPath("$.payment.status").value("PAID")).andExpect(jsonPath("$.payment.method").value("COD"))
                .andExpect(jsonPath("$.payment.confirmedByName").value("STAFF test"))
                .andExpect(jsonPath("$.timeline", hasSize(6))).andExpect(jsonPath("$.timeline[1].status").value("CONFIRMED"))
                .andExpect(jsonPath("$.timeline[1].byName").value("STAFF test")).andExpect(jsonPath("$.reviewable").value(true));

        long line = json(as(customer, get("/api/me/orders/" + id))).get("items").get(0).get("id").asLong();
        as(customer, post("/api/me/reviews"), "{\"orderItemId\":" + line + ",\"rating\":5,\"comment\":\"Ngon\"}").andExpect(status().isCreated());
        as(customer, post("/api/me/reviews"), "{\"orderItemId\":" + line + ",\"rating\":4}").andExpect(status().isConflict());
        String other = register();
        as(other, post("/api/me/reviews"), "{\"orderItemId\":" + line + ",\"rating\":1}").andExpect(status().isNotFound());
        as(null, get("/api/menu/" + pho)).andExpect(jsonPath("$.item.ratingAvg").value(5.0)).andExpect(jsonPath("$.item.soldCount").value(2))
                .andExpect(jsonPath("$.reviews[0].comment").value("Ngon"));

        String today = LocalDate.now().toString();
        as(manager, get("/api/admin/reports/revenue").param("from", today).param("to", today)).andExpect(status().isOk())
                .andExpect(jsonPath("$.revenue", greaterThanOrEqualTo(165000.0))).andExpect(jsonPath("$.topItems", not(empty())));
        as(manager, get("/api/admin/dashboard")).andExpect(status().isOk()).andExpect(jsonPath("$.deliveredToday", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.last7Days", hasSize(7)));

        // reorder puts the dishes back into the cart
        as(customer, post("/api/me/orders/" + id + "/reorder")).andExpect(jsonPath("$.itemCount").value(3));
    }

    @Test
    void checkoutRules() throws Exception {
        long addr = address(customer);
        as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + "}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("Giỏ hàng đang trống")));
        cart(customer, tea, 1).andExpect(status().isOk());
        as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + "}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("Đơn tối thiểu")));
        cart(customer, archived, 1).andExpect(status().isBadRequest());
        cart(customer, pho, 100).andExpect(status().isBadRequest());
        cart(customer, pho, 1).andExpect(status().isOk());
        // dish sold out after it was put in the cart
        as(kitchen, patch("/api/manage/menu-items/" + pho + "/availability"), "{\"available\":false}").andExpect(jsonPath("$.available").value(false));
        as(customer, get("/api/me/cart")).andExpect(jsonPath("$.hasProblems").value(true));
        as(customer, post("/api/me/checkout/preview"), "{\"addressId\":" + addr + "}").andExpect(jsonPath("$.canPlace").value(false));
        as(kitchen, patch("/api/manage/menu-items/" + pho + "/availability"), "{\"available\":true}").andExpect(status().isOk());
        // store paused by staff
        as(staff, patch("/api/manage/store/accepting"), "{\"acceptingOrders\":false}").andExpect(jsonPath("$.openNow").value(false));
        as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + "}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("tạm ngưng nhận đơn")));
        as(kitchen, patch("/api/manage/store/accepting"), "{\"acceptingOrders\":true}").andExpect(status().isForbidden());
        as(staff, patch("/api/manage/store/accepting"), "{\"acceptingOrders\":true}").andExpect(status().isOk());
        // someone else's address
        as(register(), post("/api/me/checkout/preview"), "{\"addressId\":" + addr + "}").andExpect(status().isNotFound());
        as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + "}").andExpect(status().isCreated());
    }

    @Test
    void voucherRules() throws Exception {
        String code = "V" + uniq().toUpperCase();
        as(manager, post("/api/admin/vouchers"), "{\"code\":\"" + code + "\",\"discountType\":\"PERCENT\",\"discountValue\":50,\"maxDiscount\":30000,"
                + "\"minOrder\":100000,\"perUserLimit\":1}").andExpect(status().isCreated());
        long addr = address(customer);
        cart(customer, tea, 3).andExpect(status().isOk());
        as(customer, post("/api/me/checkout/preview"), "{\"addressId\":" + addr + ",\"voucherCode\":\"" + code + "\"}")
                .andExpect(jsonPath("$.canPlace").value(false)).andExpect(jsonPath("$.voucherMessage", containsString("100.000")));
        cart(customer, pho, 2).andExpect(status().isOk());
        // 50% of 190.000 = 95.000, capped at 30.000
        as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + ",\"voucherCode\":\"" + code.toLowerCase() + "\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.discount").value(30000.0)).andExpect(jsonPath("$.total").value(175000.0));
        cart(customer, pho, 2).andExpect(status().isOk());
        as(customer, post("/api/me/checkout/preview"), "{\"addressId\":" + addr + ",\"voucherCode\":\"" + code + "\"}")
                .andExpect(jsonPath("$.voucherMessage", containsString("hết lượt")));

        as(manager, post("/api/admin/vouchers"), "{\"code\":\"OLD" + uniq() + "\",\"discountType\":\"AMOUNT\",\"discountValue\":10000,\"endAt\":\"2020-01-01T00:00:00\"}")
                .andExpect(status().isCreated());
        as(manager, post("/api/admin/vouchers"), "{\"code\":\"BAD" + uniq() + "\",\"discountType\":\"PERCENT\",\"discountValue\":150}").andExpect(status().isBadRequest());
        as(manager, post("/api/admin/vouchers"), "{\"code\":\"" + code + "\",\"discountType\":\"AMOUNT\",\"discountValue\":1}").andExpect(status().isConflict());
        as(customer, post("/api/me/checkout/preview"), "{\"addressId\":" + addr + ",\"voucherCode\":\"NOPE\"}")
                .andExpect(jsonPath("$.voucherMessage").value("Mã giảm giá không tồn tại"));
    }

    @Test
    void statusTransitionsAreRoleBound() throws Exception {
        long id = placeOrder(customer, null);
        setStatus(kitchen, id, "CONFIRMED", null).andExpect(status().isBadRequest());
        setStatus(staff, id, "PREPARING", null).andExpect(status().isBadRequest());
        setStatus(staff, id, "DELIVERED", null).andExpect(status().isBadRequest());
        setStatus(staff, id, "CONFIRMED", null).andExpect(status().isOk());
        as(customer, post("/api/me/orders/" + id + "/cancel"), "{\"reason\":\"Đổi ý\"}").andExpect(status().isBadRequest());
        as(kitchen, get("/api/manage/kitchen/queue")).andExpect(jsonPath("$[?(@.id==" + id + ")]").isNotEmpty());
        setStatus(kitchen, id, "PREPARING", null).andExpect(status().isOk());
        setStatus(staff, id, "CANCELLED", "Hết nguyên liệu").andExpect(status().isBadRequest()); // cannot cancel while cooking

        long second = placeOrder(customer, null);
        setStatus(staff, second, "CANCELLED", null).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("lý do")));
        as(customer, post("/api/me/orders/" + second + "/cancel"), "{\"reason\":\"Đặt nhầm\"}").andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.timeline[1].note", containsString("Đặt nhầm")));

        // failed delivery
        long third = placeOrder(customer, null);
        setStatus(staff, third, "CONFIRMED", null);
        setStatus(kitchen, third, "PREPARING", null);
        setStatus(kitchen, third, "READY", null);
        setStatus(staff, third, "DELIVERING", null);
        setStatus(staff, third, "CANCELLED", "Khách không nghe máy").andExpect(jsonPath("$.status").value("CANCELLED"));

        // privacy and route protection
        as(register(), get("/api/me/orders/" + id)).andExpect(status().isNotFound());
        as(null, get("/api/me/orders")).andExpect(status().isUnauthorized());
        as(staff, get("/api/me/cart")).andExpect(status().isForbidden());
        as(customer, get("/api/manage/orders")).andExpect(status().isForbidden());
        as(staff, get("/api/admin/dashboard")).andExpect(status().isForbidden());
        as("not.a.token", get("/api/menu")).andExpect(status().isUnauthorized());
    }

    @Test
    void addressBookDefaultsAndValidation() throws Exception {
        long first = address(customer);
        long second = json(as(customer, post("/api/me/addresses"), "{\"zoneId\":" + zoneId + ",\"label\":\"Công ty\",\"recipientName\":\"An\","
                + "\"recipientPhone\":\"0912345678\",\"street\":\"1 Lê Lợi\",\"makeDefault\":true}")).get("id").asLong();
        as(customer, get("/api/me/addresses")).andExpect(jsonPath("$[0].id").value(second)).andExpect(jsonPath("$[0].isDefault").value(true))
                .andExpect(jsonPath("$[1].isDefault").value(false));
        as(customer, patch("/api/me/addresses/" + first + "/default")).andExpect(jsonPath("$.isDefault").value(true));
        as(customer, delete("/api/me/addresses/" + first)).andExpect(status().isNoContent());
        as(customer, get("/api/me/addresses")).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].isDefault").value(true));
        as(customer, post("/api/me/addresses"), "{\"zoneId\":" + zoneId + ",\"label\":\"X\",\"recipientName\":\"A\",\"recipientPhone\":\"12ab\",\"street\":\"x\"}")
                .andExpect(status().isBadRequest());
        as(manager, put("/api/admin/zones/" + zoneId), "{\"name\":\"Off" + uniq() + "\",\"deliveryFee\":15000,\"estimatedMinutes\":30,\"sortOrder\":1,\"active\":false}")
                .andExpect(status().isOk());
        as(customer, post("/api/me/addresses"), "{\"zoneId\":" + zoneId + ",\"label\":\"X\",\"recipientName\":\"A\",\"recipientPhone\":\"0901234567\",\"street\":\"x\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("chưa giao tới")));
        as(register(), delete("/api/me/addresses/" + second)).andExpect(status().isNotFound());
    }

    @Test
    void favorites() throws Exception {
        as(customer, put("/api/me/favorites/" + pho)).andExpect(status().isNoContent());
        as(customer, put("/api/me/favorites/" + pho)).andExpect(status().isNoContent());
        as(customer, get("/api/me/favorites")).andExpect(jsonPath("$", hasSize(1))).andExpect(jsonPath("$[0].favorite").value(true));
        as(customer, get("/api/menu")).andExpect(jsonPath("$[?(@.id==" + pho + ")].favorite").value(true));
        as(customer, delete("/api/me/favorites/" + pho)).andExpect(status().isNoContent());
        as(customer, get("/api/me/favorites")).andExpect(jsonPath("$", hasSize(0)));
        as(customer, put("/api/me/favorites/" + archived)).andExpect(status().isBadRequest());
    }

    @Test
    void adminKeepsHistoryIntact() throws Exception {
        long id = placeOrder(customer, null);
        setStatus(staff, id, "CONFIRMED", null);
        as(manager, delete("/api/admin/menu-items/" + pho)).andExpect(status().isConflict());
        as(manager, delete("/api/admin/menu-items/" + archived)).andExpect(status().isNoContent());
        as(manager, delete("/api/admin/zones/" + zoneId)).andExpect(status().isConflict());
        as(manager, delete("/api/admin/categories/" + categoryId)).andExpect(status().isConflict());

        long staffId = json(as(staff, get("/api/auth/me"))).get("id").asLong();
        as(manager, delete("/api/admin/staff/" + staffId)).andExpect(status().isConflict());
        as(manager, patch("/api/admin/users/" + staffId + "/active"), "{\"active\":false}").andExpect(jsonPath("$.active").value(false));
        as(staff, get("/api/manage/orders")).andExpect(status().isUnauthorized());

        long managerId = json(as(manager, get("/api/auth/me"))).get("id").asLong();
        as(manager, patch("/api/admin/users/" + managerId + "/active"), "{\"active\":false}").andExpect(status().isBadRequest());
        String p = phone();
        as(manager, post("/api/admin/staff"), "{\"fullName\":\"Bếp mới\",\"phone\":\"" + p + "\",\"password\":\"Passw0rd!\",\"role\":\"KITCHEN\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("KITCHEN"));
        as(manager, post("/api/admin/staff"), "{\"fullName\":\"X\",\"phone\":\"" + phone() + "\",\"password\":\"Passw0rd!\",\"role\":\"CUSTOMER\"}")
                .andExpect(status().isBadRequest());
        String newKitchen = login(p, "Passw0rd!");
        as(newKitchen, get("/api/manage/kitchen/queue")).andExpect(status().isOk());

        as(manager, get("/api/admin/customers")).andExpect(jsonPath("$.totalElements", greaterThanOrEqualTo(1)));
        as(manager, get("/api/admin/staff")).andExpect(jsonPath("$[*].role", not(hasItem("CUSTOMER"))));
        assertTrue(userRepo.countByRoleAndActiveTrue(Role.MANAGER) >= 1);
    }

    @Test
    void storeSettings() throws Exception {
        as(manager, put("/api/admin/settings"), "{\"storeName\":\"Atlas Restaurant\",\"hotline\":\"19001234\",\"storeAddress\":\"123 Lê Lợi\","
                + "\"openTime\":\"22:00\",\"closeTime\":\"07:00\",\"minOrderAmount\":50000,\"acceptingOrders\":true}").andExpect(status().isBadRequest());
        as(manager, put("/api/admin/settings"), "{\"storeName\":\"Atlas Restaurant\",\"hotline\":\"19001234\",\"storeAddress\":\"123 Lê Lợi\","
                + "\"openTime\":\"00:00\",\"closeTime\":\"23:59:59\",\"minOrderAmount\":0,\"acceptingOrders\":true}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.minOrderAmount").value(0));
    }
}
