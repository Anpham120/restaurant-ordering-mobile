package com.restaurant.orderingsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.restaurant.orderingsystem.entity.Payment;
import com.restaurant.orderingsystem.repository.OrderRepository;
import com.restaurant.orderingsystem.repository.PaymentRepository;
import com.restaurant.orderingsystem.service.PaymentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "app.sepay.api-key=test-sepay-key")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class PaymentsOptionsPromotionsTest extends ApiTestBase {
    @Autowired PaymentService paymentService;
    @Autowired PaymentRepository paymentRepo;
    @Autowired OrderRepository orderRepo;
    @Autowired TransactionTemplate tx;

    static long sepayId = System.nanoTime() % 1_000_000_000L;

    void enableTransfer() throws Exception {
        as(manager, put("/api/admin/settings"), "{\"storeName\":\"Atlas Restaurant\",\"hotline\":\"19001234\",\"storeAddress\":\"123 Lê Lợi\","
                + "\"openTime\":\"00:00\",\"closeTime\":\"23:59:59\",\"minOrderAmount\":50000,\"acceptingOrders\":true,"
                + "\"bankCode\":\"MB\",\"bankAccount\":\"0000000000\",\"bankHolder\":\"Nhà hàng Atlas\",\"transferTimeoutMinutes\":15}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.paymentMethods", hasItem("BANK_TRANSFER")))
                .andExpect(jsonPath("$.bankHolder").value("NHA HANG ATLAS"));
    }

    long transferOrder() throws Exception {
        enableTransfer();
        long addr = address(customer);
        cart(customer, pho, 2).andExpect(status().isOk());
        return json(as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + ",\"paymentMethod\":\"BANK_TRANSFER\"}")
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("AWAITING_PAYMENT"))
                .andExpect(jsonPath("$.payment.method").value("BANK_TRANSFER")).andExpect(jsonPath("$.payment.status").value("PENDING"))
                .andExpect(jsonPath("$.payment.amount").value(145000.0))
                .andExpect(jsonPath("$.payment.qrUrl", startsWith("https://qr.sepay.vn/img?acc=0000000000&bank=MB&amount=145000&des=ATL")))
                .andExpect(jsonPath("$.payment.expiresAt").isNotEmpty())).get("id").asLong();
    }

    ResultActions webhook(String auth, long id, String content, int amount) throws Exception {
        return webhook(auth, id, content, amount, "0000000000");
    }

    ResultActions webhook(String auth, long id, String content, int amount, String account) throws Exception {
        var b = post("/api/payments/sepay/webhook").contentType(MediaType.APPLICATION_JSON).content(
                "{\"id\":" + id + ",\"gateway\":\"MBBank\",\"transactionDate\":\"2026-11-01 10:00:00\",\"accountNumber\":\"" + account + "\","
                        + "\"code\":null,\"content\":\"" + content + "\",\"transferType\":\"in\",\"transferAmount\":" + amount
                        + ",\"accumulated\":0,\"referenceCode\":\"FT" + id + "\"}");
        return mvc.perform(auth == null ? b : b.header("Authorization", auth));
    }

    @Test
    void optionsAreValidatedPricedAndKeptInOrders() throws Exception {
        JsonNode item = json(as(manager, put("/api/admin/menu-items/" + pho + "/options"), "{\"groups\":["
                + "{\"name\":\"Size\",\"minSelect\":1,\"maxSelect\":1,\"options\":[{\"name\":\"Tô thường\",\"priceDelta\":0},{\"name\":\"Tô lớn\",\"priceDelta\":15000}]},"
                + "{\"name\":\"Thêm\",\"minSelect\":0,\"maxSelect\":2,\"options\":[{\"name\":\"Trứng\",\"priceDelta\":5000},{\"name\":\"Quẩy\",\"priceDelta\":5000}]}]}")
                .andExpect(status().isOk()).andExpect(jsonPath("$.optionGroups", hasSize(2))));
        long small = item.get("optionGroups").get(0).get("options").get(0).get("id").asLong();
        long large = item.get("optionGroups").get(0).get("options").get(1).get("id").asLong();
        long egg = item.get("optionGroups").get(1).get("options").get(0).get("id").asLong();
        long quay = item.get("optionGroups").get(1).get("options").get(1).get("id").asLong();

        cart(customer, pho, 1).andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("size")));
        as(customer, post("/api/me/cart/items"), "{\"menuItemId\":" + pho + ",\"quantity\":1,\"optionIds\":[" + small + "," + large + "]}")
                .andExpect(status().isBadRequest());
        as(customer, post("/api/me/cart/items"), "{\"menuItemId\":" + pho + ",\"quantity\":2,\"optionIds\":[" + large + "," + egg + "]}")
                .andExpect(jsonPath("$.lines[0].unitPrice").value(85000.0)).andExpect(jsonPath("$.lines[0].lineTotal").value(170000.0));
        as(customer, post("/api/me/cart/items"), "{\"menuItemId\":" + pho + ",\"quantity\":1,\"optionIds\":[" + egg + "," + large + "]}")
                .andExpect(jsonPath("$.lines", hasSize(1))).andExpect(jsonPath("$.lines[0].quantity").value(3));
        as(customer, post("/api/me/cart/items"), "{\"menuItemId\":" + pho + ",\"quantity\":1,\"optionIds\":[" + small + "]}")
                .andExpect(jsonPath("$.lines", hasSize(2))).andExpect(jsonPath("$.subtotal").value(320000.0));

        long addr = address(customer);
        JsonNode order = json(as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + "}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.subtotal").value(320000.0)));
        JsonNode first = order.get("items").get(0);
        org.junit.jupiter.api.Assertions.assertEquals(2, first.get("options").size());

        // an option used by an order cannot be deleted, only switched off
        as(manager, put("/api/admin/menu-items/" + pho + "/options"), "{\"groups\":[{\"id\":" + item.get("optionGroups").get(0).get("id").asLong()
                + ",\"name\":\"Size\",\"minSelect\":1,\"maxSelect\":1,\"options\":[{\"id\":" + small + ",\"name\":\"Tô thường\",\"priceDelta\":0}]}]}")
                .andExpect(status().isConflict());
        as(manager, put("/api/admin/menu-items/" + pho + "/options"), "{\"groups\":["
                + "{\"id\":" + item.get("optionGroups").get(0).get("id").asLong() + ",\"name\":\"Size\",\"minSelect\":1,\"maxSelect\":1,\"options\":["
                + "{\"id\":" + small + ",\"name\":\"Tô thường\",\"priceDelta\":0},{\"id\":" + large + ",\"name\":\"Tô lớn\",\"priceDelta\":15000,\"available\":false}]},"
                + "{\"id\":" + item.get("optionGroups").get(1).get("id").asLong() + ",\"name\":\"Thêm\",\"minSelect\":0,\"maxSelect\":2,\"options\":["
                + "{\"id\":" + egg + ",\"name\":\"Trứng\",\"priceDelta\":5000},{\"id\":" + quay + ",\"name\":\"Quẩy\",\"priceDelta\":5000}]}]}")
                .andExpect(status().isOk());
        as(customer, post("/api/me/orders/" + order.get("id").asLong() + "/reorder")).andExpect(jsonPath("$.lines", hasSize(1)))
                .andExpect(jsonPath("$.lines[0].options[0].name").value("Tô thường"));
        // invalid structure
        as(manager, put("/api/admin/menu-items/" + tea + "/options"), "{\"groups\":[{\"name\":\"Đá\",\"minSelect\":2,\"maxSelect\":1,\"options\":[{\"name\":\"Ít\",\"priceDelta\":0}]}]}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void bankTransferIsConfirmedBySepayWebhook() throws Exception {
        long id = transferOrder();
        as(staff, get("/api/manage/orders").param("status", "PENDING")).andExpect(jsonPath("$.content[?(@.id==" + id + ")]").isEmpty());
        setStatus(staff, id, "CONFIRMED", null).andExpect(status().isBadRequest());

        webhook(null, ++sepayId, "ATL" + id, 145000).andExpect(status().isUnauthorized());
        webhook("Apikey wrong", ++sepayId, "ATL" + id, 145000).andExpect(status().isUnauthorized());
        long shortId = ++sepayId;
        webhook("Apikey test-sepay-key", shortId, "ATL" + id + " chuyen tien", 100000).andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.status").value("AWAITING_PAYMENT"));
        webhook("Apikey test-sepay-key", shortId, "ATL" + id, 100000).andExpect(status().isOk());   // same SePay id again: ignored

        webhook("Apikey test-sepay-key", ++sepayId, "MBVCB.123 atl" + id + " NGUYEN VAN AN chuyen khoan", 145000).andExpect(status().isOk());
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.status").value("PENDING"))
                .andExpect(jsonPath("$.payment.status").value("PAID")).andExpect(jsonPath("$.payment.qrUrl").doesNotExist())
                .andExpect(jsonPath("$.timeline[1].note", containsString("chuyển khoản")));
        as(customer, get("/api/me/notifications")).andExpect(jsonPath("$[0].type").value("PAYMENT"));
        webhook("Apikey test-sepay-key", ++sepayId, "khong co ma", 50000).andExpect(status().isOk());
        as(manager, get("/api/admin/bank-transactions")).andExpect(jsonPath("$[0].note").value("Không khớp đơn hàng nào"))
                .andExpect(jsonPath("$[?(@.providerTxnId==" + shortId + ")].note", hasItem(containsString("Thiếu tiền"))));

        // paid order cancelled by the store → refund queue
        setStatus(staff, id, "CANCELLED", "Hết nguyên liệu").andExpect(jsonPath("$.payment.status").value("REFUND_PENDING"));
        long payId = json(as(customer, get("/api/me/orders/" + id))).get("payment").get("id").asLong();
        as(manager, get("/api/admin/payments").param("status", "REFUND_PENDING")).andExpect(jsonPath("$[?(@.id==" + payId + ")]").isNotEmpty());
        as(manager, patch("/api/admin/payments/" + payId + "/refunded")).andExpect(jsonPath("$.status").value("REFUNDED"));
        as(manager, patch("/api/admin/payments/" + payId + "/refunded")).andExpect(status().isBadRequest());
    }

    @Test
    void unpaidTransferExpiresAndLateMoneyIsRefunded() throws Exception {
        long id = transferOrder();
        tx.executeWithoutResult(s -> {
            Payment p = orderRepo.findById(id).orElseThrow().getPayment();
            p.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        });
        paymentService.expireUnpaid();
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.payment.status").value("FAILED")).andExpect(jsonPath("$.timeline[1].note", containsString("Quá hạn")));
        webhook("Apikey test-sepay-key", ++sepayId, "ATL" + id, 145000).andExpect(status().isOk());
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.payment.status").value("REFUND_PENDING"));
    }

    @Test
    void staffCanConfirmATransferByHandAndCustomerCanCancelBeforePaying() throws Exception {
        long id = transferOrder();
        as(kitchen, patch("/api/manage/orders/" + id + "/confirm-transfer")).andExpect(status().isForbidden());
        as(staff, patch("/api/manage/orders/" + id + "/confirm-transfer")).andExpect(jsonPath("$.status").value("PAID"))
                .andExpect(jsonPath("$.confirmedByName").value("STAFF test"));
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.status").value("PENDING"));

        cart(customer, pho, 1).andExpect(status().isOk());
        long addr = json(as(customer, get("/api/me/addresses"))).get(0).get("id").asLong();
        long second = json(as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + ",\"paymentMethod\":\"BANK_TRANSFER\"}")).get("id").asLong();
        as(customer, post("/api/me/orders/" + second + "/cancel"), "{\"reason\":\"Đổi sang tiền mặt\"}").andExpect(jsonPath("$.status").value("CANCELLED"))
                .andExpect(jsonPath("$.payment.status").value("FAILED"));
    }

    @Test
    void transferUnavailableWithoutBankAccount() throws Exception {
        as(manager, put("/api/admin/settings"), "{\"storeName\":\"Atlas Restaurant\",\"hotline\":\"19001234\",\"storeAddress\":\"123 Lê Lợi\","
                + "\"openTime\":\"00:00\",\"closeTime\":\"23:59:59\",\"minOrderAmount\":50000,\"acceptingOrders\":true,\"bankCode\":\"MB\"}")
                .andExpect(status().isBadRequest());
        as(manager, put("/api/admin/settings"), "{\"storeName\":\"Atlas Restaurant\",\"hotline\":\"19001234\",\"storeAddress\":\"123 Lê Lợi\","
                + "\"openTime\":\"00:00\",\"closeTime\":\"23:59:59\",\"minOrderAmount\":50000,\"acceptingOrders\":true}")
                .andExpect(jsonPath("$.paymentMethods", contains("COD")));
        long addr = address(customer);
        cart(customer, pho, 1).andExpect(status().isOk());
        as(customer, post("/api/me/orders"), "{\"addressId\":" + addr + ",\"paymentMethod\":\"BANK_TRANSFER\"}").andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", containsString("hình thức thanh toán")));
    }

    @Test
    void promotionsAndNotifications() throws Exception {
        long voucher = json(as(manager, post("/api/admin/vouchers"), "{\"code\":\"P" + uniq() + "\",\"discountType\":\"AMOUNT\",\"discountValue\":10000}")).get("id").asLong();
        as(manager, post("/api/admin/promotions"), "{\"title\":\"X\",\"imageUrl\":\"https://example.com/a.jpg\",\"targetType\":\"MENU_ITEM\",\"sortOrder\":0}")
                .andExpect(status().isBadRequest());
        as(manager, post("/api/admin/promotions"), "{\"title\":\"X\",\"imageUrl\":\"https://example.com/a.jpg\",\"targetType\":\"NONE\",\"sortOrder\":0,"
                + "\"startAt\":\"2030-01-02T00:00:00\",\"endAt\":\"2030-01-01T00:00:00\"}").andExpect(status().isBadRequest());
        long promo = json(as(manager, post("/api/admin/promotions"), "{\"title\":\"Tuần lễ phở\",\"subtitle\":\"Giảm 10.000đ\",\"imageUrl\":\"https://example.com/p.jpg\","
                + "\"targetType\":\"VOUCHER\",\"voucherId\":" + voucher + ",\"sortOrder\":0}").andExpect(status().isCreated())
                .andExpect(jsonPath("$.live").value(true))).get("id").asLong();
        as(null, get("/api/promotions")).andExpect(jsonPath("$[?(@.id==" + promo + ")].voucherCode").isNotEmpty());
        as(manager, delete("/api/admin/vouchers/" + voucher)).andExpect(status().isConflict());

        as(customer, post("/api/me/notifications/read-all")).andExpect(status().isOk());
        as(manager, post("/api/admin/promotions/" + promo + "/announce")).andExpect(jsonPath("$.sent", greaterThanOrEqualTo(1)));
        as(manager, post("/api/admin/promotions/" + promo + "/announce")).andExpect(status().isConflict());
        as(customer, get("/api/me/notifications/unread-count")).andExpect(jsonPath("$.count").value(0)).andExpect(jsonPath("$.promotions").value(1));
        JsonNode n = json(as(customer, get("/api/me/notifications")));
        org.junit.jupiter.api.Assertions.assertEquals("PROMOTION", n.get(0).get("type").asText());
        as(customer, post("/api/me/notifications/" + n.get(0).get("id").asLong() + "/read")).andExpect(status().isNoContent());
        as(customer, get("/api/me/notifications/unread-count")).andExpect(jsonPath("$.promotions").value(0));

        long id = placeOrder(customer, null);
        setStatus(staff, id, "CONFIRMED", null).andExpect(status().isOk());
        as(customer, get("/api/me/notifications")).andExpect(jsonPath("$[0].title").value("Cửa hàng đã xác nhận đơn"))
                .andExpect(jsonPath("$[0].orderId").value(id));
        as(register(), post("/api/me/notifications/" + n.get(0).get("id").asLong() + "/read")).andExpect(status().isNotFound());

        as(manager, put("/api/admin/promotions/" + promo), "{\"title\":\"Tuần lễ phở\",\"imageUrl\":\"https://example.com/p.jpg\",\"targetType\":\"NONE\","
                + "\"sortOrder\":0,\"active\":false}").andExpect(jsonPath("$.live").value(false));
        as(null, get("/api/promotions")).andExpect(jsonPath("$[?(@.id==" + promo + ")]").isEmpty());
        as(manager, delete("/api/admin/promotions/" + promo)).andExpect(status().isNoContent());
    }

    @Test
    void bankAppDeeplinksAndForeignAccount() throws Exception {
        long id = transferOrder();
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.payment.bankApps", hasSize(12)))
                .andExpect(jsonPath("$.payment.bankApps[0].url", startsWith("https://dl.vietqr.io/pay?app=mb&ba=0000000000%40mb&am=145000&tn=ATL" + id)))
                .andExpect(jsonPath("$.payment.canSwitchToCod").value(true));
        // money with our payment code but into another account must not settle the order
        webhook("Apikey test-sepay-key", ++sepayId, "ATL" + id, 145000, "9999999999").andExpect(status().isOk());
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.status").value("AWAITING_PAYMENT"));
        as(manager, get("/api/admin/bank-transactions")).andExpect(jsonPath("$[0].note", containsString("Không phải tài khoản")));
    }

    @Test
    void customerSwitchesPaymentMethodBothWays() throws Exception {
        long id = transferOrder();
        as(customer, post("/api/me/orders/" + id + "/payment-method"), "{\"method\":\"COD\"}").andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PENDING")).andExpect(jsonPath("$.payment.method").value("COD"))
                .andExpect(jsonPath("$.payment.expiresAt").doesNotExist()).andExpect(jsonPath("$.payment.canSwitchToTransfer").value(true))
                .andExpect(jsonPath("$.timeline[1].note", containsString("thanh toán khi nhận hàng")));
        as(customer, post("/api/me/orders/" + id + "/payment-method"), "{\"method\":\"BANK_TRANSFER\"}")
                .andExpect(jsonPath("$.status").value("AWAITING_PAYMENT")).andExpect(jsonPath("$.payment.qrUrl").isNotEmpty());
        as(register(), post("/api/me/orders/" + id + "/payment-method"), "{\"method\":\"COD\"}").andExpect(status().isNotFound());
        // back to COD, store confirms → cannot switch to transfer any more
        as(customer, post("/api/me/orders/" + id + "/payment-method"), "{\"method\":\"COD\"}").andExpect(status().isOk());
        setStatus(staff, id, "CONFIRMED", null).andExpect(status().isOk());
        as(customer, post("/api/me/orders/" + id + "/payment-method"), "{\"method\":\"BANK_TRANSFER\"}").andExpect(status().isBadRequest());
        // the customer transfers anyway: the COD payment becomes a paid transfer
        webhook("Apikey test-sepay-key", ++sepayId, "ATL" + id, 145000).andExpect(status().isOk());
        as(customer, get("/api/me/orders/" + id)).andExpect(jsonPath("$.status").value("CONFIRMED"))
                .andExpect(jsonPath("$.payment.method").value("BANK_TRANSFER")).andExpect(jsonPath("$.payment.status").value("PAID"));
        // paid: no more switching
        as(customer, post("/api/me/orders/" + id + "/payment-method"), "{\"method\":\"COD\"}").andExpect(status().isBadRequest());
    }
}
