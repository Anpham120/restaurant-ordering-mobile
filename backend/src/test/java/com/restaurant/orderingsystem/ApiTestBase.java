package com.restaurant.orderingsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.restaurant.orderingsystem.entity.Role;
import com.restaurant.orderingsystem.entity.StoreSettings;
import com.restaurant.orderingsystem.entity.User;
import com.restaurant.orderingsystem.repository.StoreSettingsRepository;
import com.restaurant.orderingsystem.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.math.BigDecimal;
import java.time.LocalTime;
import java.util.concurrent.atomic.AtomicLong;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Helpers shared by the API tests: users with tokens, JSON requests, a fresh menu/zone per test. */
abstract class ApiTestBase {
    private static final AtomicLong SEQ = new AtomicLong(System.nanoTime() % 1_000_000);

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired UserRepository userRepo;
    @Autowired StoreSettingsRepository settingsRepo;
    @Autowired PasswordEncoder encoder;

    String manager, staff, kitchen, customer;
    long zoneId, categoryId, pho, tea, archived;

    static String phone() { return "09" + String.format("%08d", SEQ.incrementAndGet() % 100_000_000); }
    static String uniq() { return Long.toString(SEQ.incrementAndGet(), 36); }

    @BeforeEach
    void baseSetup() throws Exception {
        StoreSettings s = settingsRepo.findById(StoreSettings.ID).orElseThrow();
        s.setOpenTime(LocalTime.MIN);
        s.setCloseTime(LocalTime.of(23, 59, 59));
        s.setAcceptingOrders(true);
        s.setMinOrderAmount(new BigDecimal("50000"));
        settingsRepo.save(s);

        manager = tokenFor(Role.MANAGER);
        staff = tokenFor(Role.STAFF);
        kitchen = tokenFor(Role.KITCHEN);
        customer = register();

        zoneId = json(as(manager, post("/api/admin/zones"), "{\"name\":\"Q" + uniq() + "\",\"deliveryFee\":15000,\"estimatedMinutes\":30,\"sortOrder\":1}")
                .andExpect(status().isCreated())).get("id").asLong();
        categoryId = json(as(manager, post("/api/admin/categories"), "{\"name\":\"C" + uniq() + "\",\"sortOrder\":1}")
                .andExpect(status().isCreated())).get("id").asLong();
        pho = item("Pho" + uniq(), 65000, true, true);
        tea = item("Tea" + uniq(), 20000, true, true);
        archived = item("Old" + uniq(), 10000, true, false);
    }

    long item(String name, int price, boolean available, boolean active) throws Exception {
        return json(as(manager, post("/api/admin/menu-items"), "{\"categoryId\":" + categoryId + ",\"name\":\"" + name + "\",\"price\":" + price
                + ",\"imageUrl\":\"https://example.com/a.jpg\",\"available\":" + available + ",\"active\":" + active + "}")
                .andExpect(status().isCreated())).get("id").asLong();
    }

    String tokenFor(Role role) throws Exception {
        String p = phone();
        User u = new User();
        u.setFullName(role.name() + " test");
        u.setPhone(p);
        u.setPasswordHash(encoder.encode("Passw0rd!"));
        u.setRole(role);
        userRepo.save(u);
        return login(p, "Passw0rd!");
    }

    String register() throws Exception {
        return json(send(post("/api/auth/register"), "{\"fullName\":\"Khách " + uniq() + "\",\"phone\":\"" + phone() + "\",\"password\":\"Passw0rd!\"}")
                .andExpect(status().isCreated())).get("token").asText();
    }

    String login(String login, String password) throws Exception {
        return json(send(post("/api/auth/login"), "{\"login\":\"" + login + "\",\"password\":\"" + password + "\"}")
                .andExpect(status().isOk())).get("token").asText();
    }

    long address(String token) throws Exception {
        return json(as(token, post("/api/me/addresses"), "{\"zoneId\":" + zoneId + ",\"label\":\"Nhà\",\"recipientName\":\"An\",\"recipientPhone\":\"0901234567\","
                + "\"street\":\"12 Nguyễn Huệ\",\"makeDefault\":false}").andExpect(status().isCreated())).get("id").asLong();
    }

    ResultActions cart(String token, long itemId, int qty) throws Exception {
        return as(token, post("/api/me/cart/items"), "{\"menuItemId\":" + itemId + ",\"quantity\":" + qty + "}");
    }

    /** Places an order of 2 × pho (130.000đ + 15.000đ ship) and returns its id. */
    long placeOrder(String token, String voucher) throws Exception {
        long addr = address(token);
        cart(token, pho, 2).andExpect(status().isOk());
        return json(as(token, post("/api/me/orders"), "{\"addressId\":" + addr + (voucher == null ? "" : ",\"voucherCode\":\"" + voucher + "\"") + "}")
                .andExpect(status().isCreated())).get("id").asLong();
    }

    ResultActions setStatus(String token, long orderId, String status, String note) throws Exception {
        return as(token, patch("/api/manage/orders/" + orderId + "/status"), "{\"status\":\"" + status + "\"" + (note == null ? "" : ",\"note\":\"" + note + "\"") + "}");
    }

    void deliver(long orderId) throws Exception {
        setStatus(staff, orderId, "CONFIRMED", null).andExpect(status().isOk());
        setStatus(kitchen, orderId, "PREPARING", null).andExpect(status().isOk());
        setStatus(kitchen, orderId, "READY", null).andExpect(status().isOk());
        setStatus(staff, orderId, "DELIVERING", null).andExpect(status().isOk());
        setStatus(staff, orderId, "DELIVERED", null).andExpect(status().isOk());
    }

    ResultActions send(MockHttpServletRequestBuilder b, String body) throws Exception {
        return mvc.perform(b.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    ResultActions as(String token, MockHttpServletRequestBuilder b) throws Exception {
        return mvc.perform(token == null ? b : b.header("Authorization", "Bearer " + token));
    }

    ResultActions as(String token, MockHttpServletRequestBuilder b, String body) throws Exception {
        return as(token, b.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    JsonNode json(ResultActions r) throws Exception { return om.readTree(r.andReturn().getResponse().getContentAsString()); }
}
