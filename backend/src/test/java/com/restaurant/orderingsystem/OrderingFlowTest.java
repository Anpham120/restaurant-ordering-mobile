package com.restaurant.orderingsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

import java.time.LocalDate;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class OrderingFlowTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper om;
    @Autowired com.restaurant.orderingsystem.repository.UserRepository userRepo;
    @Autowired org.springframework.security.crypto.password.PasswordEncoder encoder;

    String managerToken;

    ResultActions perform(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b) throws Exception {
        return mvc.perform(b.header("Authorization", "Bearer " + managerToken));
    }
    ResultActions performAs(String token, org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b) throws Exception {
        return mvc.perform(token == null ? b : b.header("Authorization", "Bearer " + token));
    }
    String tokenFor(com.restaurant.orderingsystem.entity.Role role) throws Exception {
        String name = role.name().toLowerCase() + UUID.randomUUID().toString().substring(0, 6);
        var u = new com.restaurant.orderingsystem.entity.User();
        u.setUsername(name); u.setPasswordHash(encoder.encode("pw12345")); u.setFullName(name); u.setRole(role);
        userRepo.save(u);
        return om.readTree(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"" + name + "\",\"password\":\"pw12345\"}")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asText();
    }

    long pho, tea, soldOut;
    String qr;
    long tableId;

    JsonNode json(ResultActions r) throws Exception { return om.readTree(r.andReturn().getResponse().getContentAsString()); }
    ResultActions send(org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder b, String body) throws Exception {
        return perform(b.contentType(MediaType.APPLICATION_JSON).content(body));
    }

    @BeforeEach
    void setup() throws Exception {
        managerToken = tokenFor(com.restaurant.orderingsystem.entity.Role.MANAGER);
        String u = UUID.randomUUID().toString().substring(0, 8);
        long cat = json(send(post("/api/admin/categories"), "{\"name\":\"Cat" + u + "\",\"sortOrder\":1}").andExpect(status().isCreated())).get("id").asLong();
        pho = menuItem(cat, "Pho" + u, 50000, true);
        tea = menuItem(cat, "Tea" + u, 10000, true);
        soldOut = menuItem(cat, "Gone" + u, 1000, false);
        JsonNode t = json(send(post("/api/admin/tables"), "{\"code\":\"T" + u + "\",\"seats\":4}").andExpect(status().isCreated()));
        qr = t.get("qrToken").asText();
        tableId = t.get("id").asLong();
    }

    long menuItem(long cat, String name, int price, boolean avail) throws Exception {
        return json(send(post("/api/admin/menu-items"), "{\"categoryId\":" + cat + ",\"name\":\"" + name + "\",\"price\":" + price + ",\"available\":" + avail + "}")
                .andExpect(status().isCreated())).get("id").asLong();
    }

    String orderBody(String qr, long item, int qty, String voucher) {
        return "{\"qrToken\":\"" + qr + "\",\"items\":[{\"menuItemId\":" + item + ",\"quantity\":" + qty + "}]"
                + (voucher == null ? "" : ",\"voucherCode\":\"" + voucher + "\"") + "}";
    }

    @Test
    void health() throws Exception {
        perform(get("/api/health")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
    }

    @Test
    void menuHidesUnavailableAndSearches() throws Exception {
        perform(get("/api/menu")).andExpect(jsonPath("$[?(@.id==" + soldOut + ")]").isEmpty())
                .andExpect(jsonPath("$[?(@.id==" + pho + ")]").isNotEmpty());
        perform(get("/api/menu").param("includeUnavailable", "true")).andExpect(jsonPath("$[?(@.id==" + soldOut + ")]").isNotEmpty());
        perform(get("/api/menu").param("q", "pho")).andExpect(jsonPath("$[*].name", everyItem(containsStringIgnoringCase("pho"))));
    }

    @Test
    void qrLookup() throws Exception {
        perform(get("/api/tables/qr/" + qr)).andExpect(status().isOk()).andExpect(jsonPath("$.id").value(tableId));
        perform(get("/api/tables/qr/nope")).andExpect(status().isNotFound());
    }

    @Test
    void fullFlowOrderToPaymentAndReport() throws Exception {
        JsonNode o = json(send(post("/api/orders"), orderBody(qr, pho, 2, null)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING")).andExpect(jsonPath("$.totalAmount").value(100000.0)));
        long id = o.get("id").asLong();
        long itemId = o.get("items").get(0).get("id").asLong();
        perform(get("/api/tables/qr/" + qr)).andExpect(jsonPath("$.status").value("OCCUPIED"));

        // same table, second order request lands on the same open order
        send(post("/api/orders"), orderBody(qr, tea, 1, null)).andExpect(jsonPath("$.id").value(id))
                .andExpect(jsonPath("$.items", hasSize(2))).andExpect(jsonPath("$.totalAmount").value(110000.0));

        send(patch("/api/orders/" + id + "/status"), "{\"status\":\"CONFIRMED\"}").andExpect(jsonPath("$.status").value("CONFIRMED"));
        send(patch("/api/order-items/" + itemId + "/status"), "{\"status\":\"COOKING\"}").andExpect(jsonPath("$.status").value("COOKING"));
        JsonNode cur = json(perform(get("/api/orders/" + id)));
        for (JsonNode it : cur.get("items")) {
            send(patch("/api/order-items/" + it.get("id").asLong() + "/status"), "{\"status\":\"READY\"}").andExpect(status().isOk());
        }
        perform(get("/api/orders/" + id)).andExpect(jsonPath("$.status").value("SERVED"));

        // cannot complete by hand
        send(patch("/api/orders/" + id + "/status"), "{\"status\":\"COMPLETED\"}").andExpect(status().isBadRequest());

        // cash payment waits for staff
        long payId = json(send(post("/api/orders/" + id + "/payments"), "{\"method\":\"CASH\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))).get("id").asLong();
        send(post("/api/orders/" + id + "/payments"), "{\"method\":\"CASH\"}").andExpect(status().isBadRequest());
        perform(patch("/api/payments/" + payId + "/confirm")).andExpect(jsonPath("$.status").value("PAID"));
        perform(get("/api/orders/" + id)).andExpect(jsonPath("$.status").value("COMPLETED"));
        perform(get("/api/tables/qr/" + qr)).andExpect(jsonPath("$.status").value("FREE"));

        // review once
        String rv = "{\"orderId\":" + id + ",\"menuItemId\":" + pho + ",\"rating\":5,\"comment\":\"ngon\"}";
        send(post("/api/reviews"), rv).andExpect(status().isCreated());
        send(post("/api/reviews"), rv).andExpect(status().isBadRequest());
        perform(get("/api/menu-items/" + pho + "/reviews")).andExpect(jsonPath("$", hasSize(1)));

        // report counts it
        String today = LocalDate.now().toString();
        perform(get("/api/admin/reports/revenue").param("from", today).param("to", today)).andExpect(status().isOk())
                .andExpect(jsonPath("$.orderCount", greaterThanOrEqualTo(1)))
                .andExpect(jsonPath("$.totalRevenue", greaterThanOrEqualTo(110000.0)))
                .andExpect(jsonPath("$.topItems", not(empty())));
    }

    @Test
    void orderValidationAndAvailability() throws Exception {
        send(post("/api/orders"), orderBody(qr, soldOut, 1, null)).andExpect(status().isBadRequest());
        send(post("/api/orders"), orderBody(qr, pho, 0, null)).andExpect(status().isBadRequest());
        send(post("/api/orders"), "{\"qrToken\":\"" + qr + "\",\"items\":[]}").andExpect(status().isBadRequest());
        send(post("/api/orders"), orderBody("bad-token", pho, 1, null)).andExpect(status().isNotFound());
        send(post("/api/orders"), orderBody(qr, 999999, 1, null)).andExpect(status().isNotFound());
        perform(get("/api/tables/qr/" + qr)).andExpect(jsonPath("$.status").value("FREE"));
    }

    @Test
    void voucherRules() throws Exception {
        String code = "V" + UUID.randomUUID().toString().substring(0, 6);
        send(post("/api/admin/vouchers"), "{\"code\":\"" + code + "\",\"discountType\":\"PERCENT\",\"discountValue\":10,\"minOrder\":60000,\"usageLimit\":1}")
                .andExpect(status().isCreated());
        // below minimum
        send(post("/api/orders"), orderBody(qr, tea, 1, code)).andExpect(status().isBadRequest());
        // ok: 100000 - 10%
        long id = json(send(post("/api/orders"), orderBody(qr, pho, 2, code)).andExpect(status().isCreated())
                .andExpect(jsonPath("$.totalAmount").value(90000.0)).andExpect(jsonPath("$.discount").value(10000.0))).get("id").asLong();
        // usage limit 1 reached for another table
        String qr2 = json(send(post("/api/admin/tables"), "{\"code\":\"X" + code + "\",\"seats\":2}")).get("qrToken").asText();
        send(post("/api/orders"), orderBody(qr2, pho, 2, code)).andExpect(status().isBadRequest());
        send(post("/api/orders/" + id + "/voucher"), "{\"code\":\"nope\"}").andExpect(status().isBadRequest());
        // 100% sanity: percent above 100 rejected
        send(post("/api/admin/vouchers"), "{\"code\":\"" + code + "X\",\"discountType\":\"PERCENT\",\"discountValue\":150}").andExpect(status().isBadRequest());
    }

    @Test
    void cancelFreesTableAndBlocksPayment() throws Exception {
        long id = json(send(post("/api/orders"), orderBody(qr, pho, 1, null))).get("id").asLong();
        send(patch("/api/orders/" + id + "/status"), "{\"status\":\"CANCELLED\"}").andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.totalAmount").value(0.0));
        perform(get("/api/tables/qr/" + qr)).andExpect(jsonPath("$.status").value("FREE"));
        send(post("/api/orders/" + id + "/payments"), "{\"method\":\"CASH\"}").andExpect(status().isBadRequest());
        send(post("/api/orders/" + id + "/items"), "{\"items\":[{\"menuItemId\":" + pho + ",\"quantity\":1}]}").andExpect(status().isBadRequest());
    }

    @Test
    void electronicPaymentCompletesImmediately() throws Exception {
        long id = json(send(post("/api/orders"), orderBody(qr, pho, 1, null))).get("id").asLong();
        send(post("/api/orders/" + id + "/payments"), "{\"method\":\"EWALLET\"}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PAID"));
        perform(get("/api/orders/" + id)).andExpect(jsonPath("$.status").value("COMPLETED"));
    }

    @Test
    void serviceRequests() throws Exception {
        long id = json(send(post("/api/service-requests"), "{\"qrToken\":\"" + qr + "\",\"type\":\"WATER\"}").andExpect(status().isCreated())).get("id").asLong();
        perform(get("/api/service-requests")).andExpect(jsonPath("$[?(@.id==" + id + ")]").isNotEmpty());
        perform(patch("/api/service-requests/" + id + "/done")).andExpect(jsonPath("$.status").value("DONE"));
        perform(get("/api/service-requests")).andExpect(jsonPath("$[?(@.id==" + id + ")]").isEmpty());
        send(post("/api/service-requests"), "{\"qrToken\":\"x\",\"type\":\"WATER\"}").andExpect(status().isNotFound());
    }

    @Test
    void authAndUsers() throws Exception {
        String name = "u" + UUID.randomUUID().toString().substring(0, 6);
        send(post("/api/admin/users"), "{\"username\":\"" + name + "\",\"password\":\"secret1\",\"fullName\":\"X\",\"role\":\"STAFF\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.passwordHash").doesNotExist());
        send(post("/api/auth/login"), "{\"username\":\"" + name + "\",\"password\":\"secret1\"}").andExpect(status().isOk()).andExpect(jsonPath("$.user.role").value("STAFF")).andExpect(jsonPath("$.token").isNotEmpty());
        send(post("/api/auth/login"), "{\"username\":\"" + name + "\",\"password\":\"wrong\"}").andExpect(status().isUnauthorized());
        send(post("/api/admin/users"), "{\"username\":\"" + name + "\",\"password\":\"secret1\",\"fullName\":\"X\",\"role\":\"STAFF\"}").andExpect(status().isConflict());
    }

    @Test
    void deleteReferencedMenuItemIsConflict() throws Exception {
        send(post("/api/orders"), orderBody(qr, pho, 1, null)).andExpect(status().isCreated());
        perform(delete("/api/admin/menu-items/" + pho)).andExpect(status().isConflict());
    }

    @Test
    void rolesAreEnforced() throws Exception {
        String staff = tokenFor(com.restaurant.orderingsystem.entity.Role.STAFF);
        String kitchen = tokenFor(com.restaurant.orderingsystem.entity.Role.KITCHEN);
        long id = json(send(post("/api/orders"), orderBody(qr, pho, 1, null))).get("id").asLong();
        long itemId = json(perform(get("/api/orders/" + id))).get("items").get(0).get("id").asLong();
        // no token / bad token
        performAs(null, get("/api/admin/tables")).andExpect(status().isUnauthorized());
        performAs(null, get("/api/orders")).andExpect(status().isUnauthorized());
        performAs("garbage.token.value", get("/api/orders")).andExpect(status().isUnauthorized());
        // staff cannot use admin APIs
        performAs(staff, get("/api/admin/tables")).andExpect(status().isForbidden());
        performAs(staff, get("/api/admin/reports/revenue")).andExpect(status().isForbidden());
        // kitchen: may list orders and move items, may not change order status or confirm payments
        performAs(kitchen, get("/api/orders")).andExpect(status().isOk());
        performAs(staff, patch("/api/orders/" + id + "/status").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}")).andExpect(status().isOk());
        performAs(kitchen, patch("/api/order-items/" + itemId + "/status").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"COOKING\"}")).andExpect(status().isOk());
        performAs(kitchen, patch("/api/orders/" + id + "/status").contentType(MediaType.APPLICATION_JSON).content("{\"status\":\"CONFIRMED\"}")).andExpect(status().isForbidden());
        performAs(kitchen, get("/api/service-requests")).andExpect(status().isForbidden());
        // staff may confirm orders
        // customer endpoints stay public
        performAs(null, get("/api/menu")).andExpect(status().isOk());
        performAs(null, get("/api/orders/" + id)).andExpect(status().isOk());
    }

    @Test
    void menuFiltersByCategory() throws Exception {
        long cat = json(send(post("/api/admin/categories"), "{\"name\":\"Only" + UUID.randomUUID().toString().substring(0, 6) + "\",\"sortOrder\":9}")).get("id").asLong();
        long only = menuItem(cat, "Solo" + UUID.randomUUID().toString().substring(0, 6), 1234, true);
        perform(get("/api/menu").param("category", String.valueOf(cat))).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].id").value(only));
    }

    @Test
    void expiredAndNotYetActiveVouchersAreRejected() throws Exception {
        String sfx = UUID.randomUUID().toString().substring(0, 6);
        send(post("/api/admin/vouchers"), "{\"code\":\"OLD" + sfx + "\",\"discountType\":\"AMOUNT\",\"discountValue\":5000,\"endAt\":\"2020-01-01T00:00:00\"}").andExpect(status().isCreated());
        send(post("/api/admin/vouchers"), "{\"code\":\"NEW" + sfx + "\",\"discountType\":\"AMOUNT\",\"discountValue\":5000,\"startAt\":\"2099-01-01T00:00:00\"}").andExpect(status().isCreated());
        send(post("/api/orders"), orderBody(qr, pho, 1, "OLD" + sfx)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("expired")));
        send(post("/api/orders"), orderBody(qr, pho, 1, "NEW" + sfx)).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("not active")));
    }
}
