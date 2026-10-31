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

import java.io.IOException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Boots the real "prod" profile against a real (embedded) PostgreSQL:
 * Flyway applies db/migration, Hibernate validates the schema, the first admin is bootstrapped,
 * demo seeding stays off, and a basic order flow works end to end.
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
        r.add("APP_CORS_ORIGINS", () -> "https://app.example.com");
        r.add("app.admin.username", () -> "boss");
        r.add("app.admin.password", () -> "S3cure-pass!");
    }

    @AfterAll
    static void stop() throws IOException { PG.close(); }

    @Autowired MockMvc mvc;
    @Autowired JdbcTemplate jdbc;
    @Autowired ObjectMapper om;

    @Test
    void prodProfileOnPostgres() throws Exception {
        assertEquals(1, jdbc.queryForObject("select count(*) from flyway_schema_history where success and version = '1'", Integer.class));
        assertEquals(1, jdbc.queryForObject("select count(*) from users", Integer.class));          // only the bootstrapped admin
        assertEquals(0, jdbc.queryForObject("select count(*) from menu_items", Integer.class));     // no demo data in prod

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content("{\"username\":\"manager\",\"password\":\"manager123\"}"))
                .andExpect(status().isUnauthorized());
        String token = om.readTree(mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON)
                .content("{\"username\":\"boss\",\"password\":\"S3cure-pass!\"}")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString()).get("token").asText();
        String auth = "Bearer " + token;

        long cat = om.readTree(mvc.perform(post("/api/admin/categories").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Món chính\",\"sortOrder\":1}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        long item = om.readTree(mvc.perform(post("/api/admin/menu-items").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"categoryId\":" + cat + ",\"name\":\"Phở bò\",\"price\":55000}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("id").asLong();
        String qr = om.readTree(mvc.perform(post("/api/admin/tables").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON)
                .content("{\"code\":\"T1\",\"seats\":4}")).andExpect(status().isCreated()).andReturn().getResponse().getContentAsString()).get("qrToken").asText();

        long order = om.readTree(mvc.perform(post("/api/orders").contentType(MediaType.APPLICATION_JSON)
                .content("{\"qrToken\":\"" + qr + "\",\"items\":[{\"menuItemId\":" + item + ",\"quantity\":2}]}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.totalAmount").value(110000.0))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(post("/api/orders/" + order + "/payments").contentType(MediaType.APPLICATION_JSON).content("{\"method\":\"EWALLET\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PAID"));
        mvc.perform(get("/api/admin/reports/revenue").header("Authorization", auth))
                .andExpect(status().isOk()).andExpect(jsonPath("$.totalRevenue").value(110000.0)).andExpect(jsonPath("$.topItems[0].name").value("Phở bò"));

        // duplicate unique key -> 409 from Postgres too
        mvc.perform(post("/api/admin/tables").header("Authorization", auth).contentType(MediaType.APPLICATION_JSON).content("{\"code\":\"T1\",\"seats\":2}"))
                .andExpect(status().isConflict());
        // CORS only for the configured origin
        mvc.perform(options("/api/menu").header("Origin", "https://evil.example").header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isForbidden());
        mvc.perform(options("/api/menu").header("Origin", "https://app.example.com").header("Access-Control-Request-Method", "GET"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin", "https://app.example.com"));
    }
}
