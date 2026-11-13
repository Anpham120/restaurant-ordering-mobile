package com.restaurant.orderingsystem;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Customer feedback reaches the store, the store's answer reaches the customer. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class FeedbackTest extends ApiTestBase {

    @Test
    void feedbackGoesToTheStoreAndTheReplyComesBack() throws Exception {
        long order = placeOrder(customer, null);
        long id = json(as(customer, post("/api/me/feedback"), "{\"topic\":\"FOOD\",\"orderId\":" + order + ",\"message\":\"  Phở hơi nguội  \"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.message").value("Phở hơi nguội"))
                .andExpect(jsonPath("$.orderCode", startsWith("DH"))).andExpect(jsonPath("$.reply").isEmpty())).get("id").asLong();

        // the store hears about it and sees it among the unanswered ones
        as(staff, get("/api/manage/notifications")).andExpect(jsonPath("$[0].type").value("FEEDBACK"))
                .andExpect(jsonPath("$[0].body", containsString("Phở hơi nguội")));
        as(staff, get("/api/manage/feedback?answered=false")).andExpect(jsonPath("$[?(@.id==" + id + ")]").isNotEmpty());
        as(manager, get("/api/manage/feedback/waiting")).andExpect(jsonPath("$.count").value(greaterThan(0)));

        as(staff, post("/api/manage/feedback/" + id + "/reply"), "{\"reply\":\" \"}").andExpect(status().isBadRequest());
        as(staff, post("/api/manage/feedback/" + id + "/reply"), "{\"reply\":\"Xin lỗi bạn, lần sau quán đóng hộp giữ nhiệt.\"}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.repliedByName").value("STAFF test"));
        as(staff, get("/api/manage/feedback?answered=false")).andExpect(jsonPath("$[?(@.id==" + id + ")]").isEmpty());
        as(staff, get("/api/manage/feedback?answered=true")).andExpect(jsonPath("$[?(@.id==" + id + ")]").isNotEmpty());

        as(customer, get("/api/me/feedback")).andExpect(jsonPath("$[0].reply", startsWith("Xin lỗi bạn")));
        as(customer, get("/api/me/notifications")).andExpect(jsonPath("$[0].type").value("FEEDBACK"))
                .andExpect(jsonPath("$[0].title").value("Cửa hàng đã trả lời góp ý của bạn"));
        as(customer, get("/api/me/notifications/unread-count")).andExpect(jsonPath("$.count").value(greaterThan(0)));
    }

    @Test
    void feedbackRules() throws Exception {
        as(customer, post("/api/me/feedback"), "{\"topic\":\"APP\",\"message\":\"\"}").andExpect(status().isBadRequest());
        as(customer, post("/api/me/feedback"), "{\"message\":\"Không có chủ đề\"}").andExpect(status().isBadRequest());
        as(customer, post("/api/me/feedback"), "{\"topic\":\"APP\",\"message\":\"" + "a".repeat(1001) + "\"}").andExpect(status().isBadRequest());
        // someone else's order
        long theirs = placeOrder(register(), null);
        as(customer, post("/api/me/feedback"), "{\"topic\":\"ORDER\",\"orderId\":" + theirs + ",\"message\":\"Đơn của ai?\"}").andExpect(status().isNotFound());
        // the store side is for staff and managers only
        as(customer, get("/api/manage/feedback")).andExpect(status().isForbidden());
        as(kitchen, get("/api/manage/feedback")).andExpect(status().isForbidden());
        as(shipper, get("/api/manage/feedback")).andExpect(status().isForbidden());
        as(staff, post("/api/me/feedback"), "{\"topic\":\"APP\",\"message\":\"x\"}").andExpect(status().isForbidden());
        // at most 5 a day
        String c = register();
        for (int i = 0; i < 5; i++) as(c, post("/api/me/feedback"), "{\"topic\":\"OTHER\",\"message\":\"Góp ý " + i + "\"}").andExpect(status().isCreated());
        as(c, post("/api/me/feedback"), "{\"topic\":\"OTHER\",\"message\":\"Thêm nữa\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("hotline")));
    }
}
