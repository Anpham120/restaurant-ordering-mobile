package com.restaurant.orderingsystem;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * The real "prod" profile on a real (embedded) PostgreSQL: Flyway builds the schema, Hibernate validates every entity
 * against it, the store row and first manager are bootstrapped, demo seeding stays off, database constraints hold,
 * and an order goes from cart to delivered.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("prod")
class PostgresProdProfileTest {
    static final EmbeddedPostgres PG;
    static {
        try { PG = EmbeddedPostgres.start(); } catch (IOException e) { throw new IllegalStateException(e); }
    }

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry r) {
        r.add("DB_URL", () -> PG.getJdbcUrl("postgres", "postgres"));
        r.add("DB_USERNAME", () -> "postgres");
        r.add("DB_PASSWORD", () -> "");
        r.add("APP_JWT_SECRET", () -> "test-secret-that-is-definitely-longer-than-32-bytes");
        r.add("APP_CORS_ORIGINS", () -> "https://order.example.com");
        r.add("app.admin.phone", () -> "0911111111");
        r.add("app.admin.password", () -> "S3cure-pass!");
    }

    @AfterAll
    static void stop() throws IOException { PG.close(); }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper om;

    ResultActions call(String token, MockHttpServletRequestBuilder b, String body) throws Exception {
        if (token != null) b = b.header("Authorization", "Bearer " + token);
        if (body != null) b = b.contentType(MediaType.APPLICATION_JSON).content(body);
        return mvc.perform(b);
    }

    String field(ResultActions r, String f) throws Exception { return om.readTree(r.andReturn().getResponse().getContentAsString()).get(f).asText(); }

    @Test
    void prodProfileOnPostgres() throws Exception {
        assertEquals(4, jdbc.queryForObject("select count(*) from flyway_schema_history where success and version in ('1', '2', '3', '4')", Integer.class));
        assertEquals(21, jdbc.queryForObject("select count(*) from information_schema.tables where table_schema = 'public' and table_name <> 'flyway_schema_history'", Integer.class));
        assertEquals(1, jdbc.queryForObject("select count(*) from users", Integer.class));
        assertEquals(1, jdbc.queryForObject("select count(*) from store_settings", Integer.class));
        assertEquals(0, jdbc.queryForObject("select count(*) from menu_items", Integer.class));
        // open all day for the test, whatever time it runs
        jdbc.update("update store_settings set open_time = '00:00', close_time = '23:59:59'");

        String admin = field(call(null, post("/api/auth/login"), "{\"login\":\"0911111111\",\"password\":\"S3cure-pass!\"}").andExpect(status().isOk()), "token");
        String cat = field(call(admin, post("/api/admin/categories"), "{\"name\":\"Phở\",\"sortOrder\":1}").andExpect(status().isCreated()), "id");
        String pho = field(call(admin, post("/api/admin/menu-items"), "{\"categoryId\":" + cat + ",\"name\":\"Phở bò\",\"price\":65000}")
                .andExpect(status().isCreated()), "id");
        call(admin, post("/api/admin/staff"), "{\"fullName\":\"NV\",\"phone\":\"0922222222\",\"password\":\"Passw0rd!\",\"role\":\"STAFF\"}").andExpect(status().isCreated());
        call(admin, post("/api/admin/staff"), "{\"fullName\":\"Bếp\",\"phone\":\"0933333333\",\"password\":\"Passw0rd!\",\"role\":\"KITCHEN\"}").andExpect(status().isCreated());
        String staff = field(call(null, post("/api/auth/login"), "{\"login\":\"0922222222\",\"password\":\"Passw0rd!\"}"), "token");
        String kitchen = field(call(null, post("/api/auth/login"), "{\"login\":\"0933333333\",\"password\":\"Passw0rd!\"}"), "token");

        String customer = field(call(null, post("/api/auth/register"), "{\"fullName\":\"An\",\"phone\":\"0944444444\",\"password\":\"Passw0rd!\"}")
                .andExpect(status().isCreated()), "token");
        String addr = field(call(customer, post("/api/me/addresses"), "{\"label\":\"Nhà\",\"recipientName\":\"An\","
                + "\"recipientPhone\":\"0944444444\",\"street\":\"12 Nguyễn Huệ\",\"latitude\":20.990000,\"longitude\":105.780000,\"makeDefault\":true}").andExpect(status().isCreated()), "id");
        call(customer, post("/api/me/cart/items"), "{\"menuItemId\":" + pho + ",\"quantity\":2}").andExpect(status().isOk());
        String order = field(call(customer, post("/api/me/orders"), "{\"addressId\":" + addr + "}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.total").value(145000.0)), "id");
        for (String[] s : new String[][]{{staff, "CONFIRMED"}, {kitchen, "PREPARING"}, {kitchen, "READY"}, {staff, "DELIVERING"}, {staff, "DELIVERED"}}) {
            call(s[0], patch("/api/manage/orders/" + order + "/status"), "{\"status\":\"" + s[1] + "\"}").andExpect(status().isOk());
        }
        assertEquals(6, jdbc.queryForObject("select count(*) from order_status_history where order_id = " + order, Integer.class));
        call(admin, get("/api/admin/dashboard"), null).andExpect(status().isOk()).andExpect(jsonPath("$.revenueToday").value(145000.0));

        // the database itself rejects broken data
        assertEquals("23514", sqlState("update order_items set quantity = 0"));                      // check violation
        assertEquals("23514", sqlState("update payments set status = 'PAID', paid_at = null"));          // paid needs paid_at
        assertEquals("23505", sqlState("insert into payments(order_id, method, amount, status, created_at, updated_at) select order_id, 'COD', 1, 'PENDING', now(), now() from payments")); // one payment per order
        assertEquals("23505", sqlState("update addresses set is_default = true where id = " + addr + "; insert into addresses(user_id, label, recipient_name, recipient_phone, street, is_default, created_at) select user_id, 'B', 'B', '0944444444', 'x', true, now() from addresses where id = " + addr));
        assertEquals("23514", sqlState("update addresses set latitude = 20.99, longitude = null"));      // a position is both coordinates or none
        assertEquals("23514", sqlState("update store_settings set delivery_max_km = 1, delivery_base_km = 5"));   // radius smaller than the base radius
        assertEquals("23503", sqlState("delete from menu_items where id = " + pho));                   // FK: ordered dish
        assertEquals("23514", sqlState("insert into store_settings(id, store_name, hotline, store_address, open_time, close_time, updated_at) values (2,'x','1','x','08:00','09:00',now())"));

        call(null, options("/api/menu").header("Origin", "https://evil.example").header("Access-Control-Request-Method", "GET"), null)
                .andExpect(status().isForbidden());
        call(null, get("/h2-console"), null).andExpect(status().isNotFound());
    }

    private String sqlState(String sql) {
        try {
            jdbc.execute(sql);
            return "no error";
        } catch (org.springframework.dao.DataAccessException e) {
            return ((java.sql.SQLException) e.getMostSpecificCause()).getSQLState();
        }
    }
}
