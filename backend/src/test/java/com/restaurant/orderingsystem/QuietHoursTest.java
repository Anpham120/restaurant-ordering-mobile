package com.restaurant.orderingsystem;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Quiet hours covering the whole day: an announcement is postponed instead of being sent. */
@SpringBootTest(properties = {"app.promotions.quiet-start=00:00", "app.promotions.quiet-end=23:59:59"})
@AutoConfigureMockMvc
@ActiveProfiles("test")
class QuietHoursTest extends ApiTestBase {

    @Test
    void announcementDuringQuietHoursIsScheduled() throws Exception {
        long promo = json(as(manager, post("/api/admin/promotions"), "{\"title\":\"Đêm khuya\",\"imageUrl\":\"https://example.com/n.jpg\",\"targetType\":\"NONE\",\"sortOrder\":0}")).get("id").asLong();
        as(manager, post("/api/admin/promotions/" + promo + "/announce")).andExpect(status().isOk())
                .andExpect(jsonPath("$.sent").value(0)).andExpect(jsonPath("$.scheduledAt").isNotEmpty())
                .andExpect(jsonPath("$.message", containsString("giờ yên lặng")));
        as(customer, get("/api/me/notifications").param("category", "PROMOTION")).andExpect(jsonPath("$", hasSize(0)));
        as(manager, get("/api/admin/promotions")).andExpect(jsonPath("$[?(@.id==" + promo + ")].announceAt").isNotEmpty())
                .andExpect(jsonPath("$[?(@.id==" + promo + ")].notified").value(false));
    }
}
