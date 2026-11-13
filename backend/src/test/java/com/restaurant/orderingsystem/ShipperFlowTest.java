package com.restaurant.orderingsystem;

import com.restaurant.orderingsystem.entity.Role;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Delivery is confirmed by the shipper with a doorstep photo, and the store is told about the outcome. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ShipperFlowTest extends ApiTestBase {

    long readyOrder() throws Exception {
        long id = placeOrder(customer, null);
        setStatus(staff, id, "CONFIRMED", null).andExpect(status().isOk());
        setStatus(kitchen, id, "PREPARING", null).andExpect(status().isOk());
        setStatus(kitchen, id, "READY", null).andExpect(status().isOk());
        return id;
    }

    String deliverBody(String photo) { return "{\"photo\":\"" + photo + "\",\"note\":\"Gửi bảo vệ tòa nhà\"}"; }

    @Test
    void onlyAShipperWithAPhotoCanCompleteADelivery() throws Exception {
        long id = readyOrder();
        // the store can no longer send an order out or close it by itself
        setStatus(staff, id, "DELIVERING", null).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("shipper")));
        setStatus(manager, id, "DELIVERING", null).andExpect(status().isBadRequest());

        as(shipper, get("/api/shipper/board")).andExpect(jsonPath("$.available[?(@.id==" + id + ")]").isNotEmpty());
        as(shipper, post("/api/shipper/orders/" + id + "/claim")).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERING")).andExpect(jsonPath("$.shipperName").value("SHIPPER test"));
        as(shipper, get("/api/shipper/board")).andExpect(jsonPath("$.delivering[?(@.id==" + id + ")]").isNotEmpty())
                .andExpect(jsonPath("$.available[?(@.id==" + id + ")]").isEmpty());
        as(customer, get("/api/me/notifications")).andExpect(jsonPath("$[0].body", containsString("SHIPPER test")));

        // a second shipper can neither take it nor see or finish it
        String other = tokenFor(Role.SHIPPER);
        as(other, post("/api/shipper/orders/" + id + "/claim")).andExpect(status().isConflict());
        as(other, get("/api/shipper/orders/" + id)).andExpect(status().isNotFound());
        as(other, post("/api/shipper/orders/" + id + "/deliver"), deliverBody(PHOTO)).andExpect(status().isForbidden());
        setStatus(staff, id, "DELIVERED", null).andExpect(status().isBadRequest());

        // no photo, not an image, too big
        as(shipper, post("/api/shipper/orders/" + id + "/deliver"), "{\"photo\":\"\"}").andExpect(status().isBadRequest());
        as(shipper, post("/api/shipper/orders/" + id + "/deliver"), deliverBody("aGVsbG8gd29ybGQ=")).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("JPEG")));
        String huge = "/9j/" + "A".repeat(1_000_000);
        as(shipper, post("/api/shipper/orders/" + id + "/deliver"), deliverBody(huge)).andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("quá lớn")));

        as(shipper, post("/api/shipper/orders/" + id + "/deliver"), deliverBody(PHOTO)).andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED")).andExpect(jsonPath("$.deliveryProof").value(true))
                .andExpect(jsonPath("$.payment.status").value("PAID"))
                .andExpect(jsonPath("$.timeline[-1].note").value("Gửi bảo vệ tòa nhà"));
        as(shipper, post("/api/shipper/orders/" + id + "/deliver"), deliverBody(PHOTO)).andExpect(status().isConflict());
        as(shipper, get("/api/shipper/board")).andExpect(jsonPath("$.finishedToday[?(@.id==" + id + ")]").isNotEmpty());

        // the store hears about it, with the photo one tap away
        as(staff, get("/api/manage/notifications/unread-count")).andExpect(jsonPath("$.count").value(greaterThan(0)));
        as(staff, get("/api/manage/notifications")).andExpect(jsonPath("$[?(@.orderId==" + id + ")].title", hasItem(startsWith("Giao thành công"))))
                .andExpect(jsonPath("$[?(@.orderId==" + id + ")].body", hasItem(containsString("Đã thu tiền mặt"))));
        as(manager, get("/api/manage/notifications")).andExpect(jsonPath("$[?(@.orderId==" + id + ")]").isNotEmpty());
        as(staff, get("/api/manage/orders/" + id + "/delivery-proof")).andExpect(status().isOk())
                .andExpect(jsonPath("$.photo", startsWith("data:image/jpeg;base64,"))).andExpect(jsonPath("$.shipperName").value("SHIPPER test"));
        as(customer, get("/api/me/orders/" + id + "/delivery-proof")).andExpect(status().isOk());
        as(register(), get("/api/me/orders/" + id + "/delivery-proof")).andExpect(status().isNotFound());
        as(other, get("/api/shipper/orders/" + id + "/delivery-proof")).andExpect(status().isNotFound());
    }

    @Test
    void failedDeliveryNeedsAReasonAndAlertsTheStore() throws Exception {
        long id = readyOrder();
        as(shipper, post("/api/shipper/orders/" + id + "/claim")).andExpect(status().isOk());
        as(shipper, post("/api/shipper/orders/" + id + "/fail"), "{\"note\":\" \"}").andExpect(status().isBadRequest());
        as(shipper, post("/api/shipper/orders/" + id + "/fail"), "{\"note\":\"Khách không nghe máy\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED")).andExpect(jsonPath("$.deliveryProof").value(false));
        as(staff, get("/api/manage/notifications")).andExpect(jsonPath("$[?(@.orderId==" + id + ")].title", hasItem(startsWith("Giao thất bại"))));
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.payment.status").value("FAILED"));
    }

    @Test
    void shipperRoutesAreForShippersOnly() throws Exception {
        as(staff, get("/api/shipper/board")).andExpect(status().isForbidden());
        as(customer, get("/api/shipper/board")).andExpect(status().isForbidden());
        as(shipper, get("/api/manage/orders")).andExpect(status().isForbidden());
        as(shipper, get("/api/me/orders")).andExpect(status().isForbidden());
        // a shipper only sees orders that are waiting for a courier
        long fresh = placeOrder(customer, null);
        as(shipper, get("/api/shipper/orders/" + fresh)).andExpect(status().isNotFound());
        as(shipper, post("/api/shipper/orders/" + fresh + "/claim")).andExpect(status().isConflict());
    }
}
