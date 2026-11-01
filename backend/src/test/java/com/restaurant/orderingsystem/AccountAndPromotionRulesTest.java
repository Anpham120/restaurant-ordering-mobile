package com.restaurant.orderingsystem;

import com.fasterxml.jackson.databind.JsonNode;
import com.restaurant.orderingsystem.entity.PasswordResetToken;
import com.restaurant.orderingsystem.repository.PasswordResetTokenRepository;
import com.restaurant.orderingsystem.repository.PromotionRepository;
import com.restaurant.orderingsystem.service.MailService;
import com.restaurant.orderingsystem.service.PasswordResetService;
import com.restaurant.orderingsystem.service.PromotionService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AccountAndPromotionRulesTest extends ApiTestBase {
    @Autowired MailService mail;
    @Autowired PasswordResetTokenRepository resetTokens;
    @Autowired PromotionRepository promotionRepo;
    @Autowired PromotionService promotionService;
    @Autowired TransactionTemplate tx;

    record Account(String phone, String email, String token) {}

    Account customerWithEmail() throws Exception {
        String phone = phone(), email = "kh" + uniq() + "@example.com";
        String token = json(send(post("/api/auth/register"), "{\"fullName\":\"Khách\",\"phone\":\"" + phone + "\",\"email\":\"" + email
                + "\",\"password\":\"Passw0rd!\"}").andExpect(status().isCreated())).get("token").asText();
        return new Account(phone, email, token);
    }

    /** Waits for the (asynchronous) mail to the address and returns the 6-digit code in it. */
    String codeSentTo(String email, int expectedMails) throws Exception {
        for (int i = 0; i < 50; i++) {
            var mails = mail.outbox().stream().filter(m -> m.to().equals(email)).toList();
            if (mails.size() >= expectedMails) {
                Matcher m = Pattern.compile("\\b(\\d{6})\\b").matcher(mails.get(expectedMails - 1).body());
                assertTrue(m.find());
                return m.group(1);
            }
            Thread.sleep(50);
        }
        fail("no mail to " + email);
        return null;
    }

    String forgot(String login) throws Exception {
        return json(send(post("/api/auth/forgot-password"), "{\"login\":\"" + login + "\"}").andExpect(status().isOk())).get("message").asText();
    }

    @Test
    void forgotPasswordWithEmailedCode() throws Exception {
        Account a = customerWithEmail();
        String msg = forgot(a.phone());
        assertEquals(PasswordResetService.GENERIC, msg);
        assertEquals(msg, forgot("0999999999"));                       // unknown account: identical answer, no mail
        assertEquals(msg, forgot(a.email().toUpperCase()));             // resend within 60 s: ignored
        String code = codeSentTo(a.email(), 1);
        Thread.sleep(300);
        assertEquals(1, mail.outbox().stream().filter(m -> m.to().equals(a.email())).count());
        assertNotEquals(code, resetTokens.findAll().stream().filter(t -> true).map(PasswordResetToken::getCodeHash).findFirst().orElse(code));

        send(post("/api/auth/reset-password"), "{\"login\":\"" + a.phone() + "\",\"code\":\"12345\",\"newPassword\":\"NewPassw0rd\"}")
                .andExpect(status().isBadRequest());                                           // not 6 digits
        String wrong = code.equals("000000") ? "111111" : "000000";
        send(post("/api/auth/reset-password"), "{\"login\":\"" + a.phone() + "\",\"code\":\"" + wrong + "\",\"newPassword\":\"NewPassw0rd\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("còn 4 lần")));
        send(post("/api/auth/reset-password"), "{\"login\":\"" + a.phone() + "\",\"code\":\"" + code + "\",\"newPassword\":\"NewPassw0rd\"}")
                .andExpect(status().isOk());
        as(a.token(), get("/api/auth/me")).andExpect(status().isUnauthorized());           // old sessions revoked
        login(a.phone(), "NewPassw0rd");
        send(post("/api/auth/reset-password"), "{\"login\":\"" + a.phone() + "\",\"code\":\"" + code + "\",\"newPassword\":\"Another123\"}")
                .andExpect(status().isBadRequest());                                           // a code works once
        assertTrue(mail.outbox().stream().anyMatch(m -> m.to().equals(a.email()) && m.subject().contains("đã được thay đổi")));
    }

    @Test
    void codeIsBurnedAfterFiveWrongAttemptsAndExpires() throws Exception {
        Account a = customerWithEmail();
        forgot(a.phone());
        String code = codeSentTo(a.email(), 1);
        String wrong = code.equals("000000") ? "111111" : "000000";
        for (int i = 0; i < 5; i++)
            send(post("/api/auth/reset-password"), "{\"login\":\"" + a.phone() + "\",\"code\":\"" + wrong + "\",\"newPassword\":\"NewPassw0rd\"}")
                    .andExpect(status().isBadRequest());
        send(post("/api/auth/reset-password"), "{\"login\":\"" + a.phone() + "\",\"code\":\"" + code + "\",\"newPassword\":\"NewPassw0rd\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("hết hạn")));

        Account b = customerWithEmail();
        forgot(b.email());
        String codeB = codeSentTo(b.email(), 1);
        tx.executeWithoutResult(s -> resetTokens.findAll().stream().filter(t -> t.getUser().getPhone().equals(b.phone()))
                .forEach(t -> { t.setCreatedAt(LocalDateTime.now().minusMinutes(20)); t.setExpiresAt(LocalDateTime.now().minusMinutes(10)); }));
        send(post("/api/auth/reset-password"), "{\"login\":\"" + b.phone() + "\",\"code\":\"" + codeB + "\",\"newPassword\":\"NewPassw0rd\"}")
                .andExpect(status().isBadRequest());
    }

    @Test
    void managerResetForcesPasswordChange() throws Exception {
        String p = phone();
        String token = json(send(post("/api/auth/register"), "{\"fullName\":\"Không email\",\"phone\":\"" + p + "\",\"password\":\"Passw0rd!\"}")).get("token").asText();
        long id = json(as(token, get("/api/auth/me"))).get("id").asLong();
        String temp = json(as(manager, post("/api/admin/users/" + id + "/reset-password")).andExpect(status().isOk())).get("temporaryPassword").asText();
        assertTrue(temp.startsWith("Atlas-") && temp.length() == 12);
        as(token, get("/api/auth/me")).andExpect(status().isUnauthorized());
        String t2 = json(send(post("/api/auth/login"), "{\"login\":\"" + p + "\",\"password\":\"" + temp + "\"}")
                .andExpect(jsonPath("$.user.mustChangePassword").value(true))).get("token").asText();
        as(t2, get("/api/me/cart")).andExpect(status().isForbidden()).andExpect(jsonPath("$.error", containsString("đổi mật khẩu")));
        String t3 = json(as(t2, post("/api/auth/change-password"), "{\"currentPassword\":\"" + temp + "\",\"newPassword\":\"MyNewPass1\"}")
                .andExpect(jsonPath("$.user.mustChangePassword").value(false))).get("token").asText();
        as(t3, get("/api/me/cart")).andExpect(status().isOk());
        long managerId = json(as(manager, get("/api/auth/me"))).get("id").asLong();
        as(manager, post("/api/admin/users/" + managerId + "/reset-password")).andExpect(status().isBadRequest());
        as(staff, post("/api/admin/users/" + id + "/reset-password")).andExpect(status().isForbidden());
    }

    @Test
    void bannersAreFilteredPerCustomer() throws Exception {
        String code = "B" + uniq().toUpperCase();
        long voucher = json(as(manager, post("/api/admin/vouchers"), "{\"code\":\"" + code + "\",\"discountType\":\"AMOUNT\",\"discountValue\":10000,\"perUserLimit\":1}")).get("id").asLong();
        long vPromo = json(as(manager, post("/api/admin/promotions"), "{\"title\":\"Mã " + code + "\",\"imageUrl\":\"https://example.com/v.jpg\","
                + "\"targetType\":\"VOUCHER\",\"voucherId\":" + voucher + ",\"sortOrder\":0}")).get("id").asLong();
        long dish = item("Sold" + uniq(), 50000, true, true);
        long dPromo = json(as(manager, post("/api/admin/promotions"), "{\"title\":\"Món mới\",\"imageUrl\":\"https://example.com/d.jpg\","
                + "\"targetType\":\"MENU_ITEM\",\"menuItemId\":" + dish + ",\"sortOrder\":0}")).get("id").asLong();

        String other = register();
        as(customer, get("/api/promotions")).andExpect(jsonPath("$[?(@.id==" + vPromo + ")]").isNotEmpty());
        placeOrder(customer, code);                                                    // customer uses up the voucher
        as(customer, get("/api/promotions")).andExpect(jsonPath("$[?(@.id==" + vPromo + ")]").isEmpty());
        as(other, get("/api/promotions")).andExpect(jsonPath("$[?(@.id==" + vPromo + ")]").isNotEmpty());

        as(null, get("/api/promotions")).andExpect(jsonPath("$[?(@.id==" + dPromo + ")]").isNotEmpty());
        as(kitchen, patch("/api/manage/menu-items/" + dish + "/availability"), "{\"available\":false}").andExpect(status().isOk());
        as(null, get("/api/promotions")).andExpect(jsonPath("$[?(@.id==" + dPromo + ")]").isEmpty())
                .andExpect(jsonPath("$", hasSize(lessThanOrEqualTo(5))));
    }

    @Test
    void announcementsRespectFrequencyCapAndOptOut() throws Exception {
        String optedOut = register();
        as(optedOut, put("/api/auth/profile"), "{\"fullName\":\"Không nhận KM\",\"marketingOptIn\":false}")
                .andExpect(jsonPath("$.marketingOptIn").value(false));
        long first = json(as(manager, post("/api/admin/promotions"), "{\"title\":\"CT 1\",\"imageUrl\":\"https://example.com/1.jpg\",\"targetType\":\"NONE\",\"sortOrder\":0}")).get("id").asLong();
        long second = json(as(manager, post("/api/admin/promotions"), "{\"title\":\"CT 2\",\"imageUrl\":\"https://example.com/2.jpg\",\"targetType\":\"NONE\",\"sortOrder\":0}")).get("id").asLong();
        as(manager, post("/api/admin/promotions/" + first + "/announce")).andExpect(jsonPath("$.sent", greaterThanOrEqualTo(1)));
        as(manager, post("/api/admin/promotions/" + second + "/announce")).andExpect(jsonPath("$.sent").value(0))
                .andExpect(jsonPath("$.skipped", greaterThanOrEqualTo(1))).andExpect(jsonPath("$.message", containsString("bỏ qua")));
        as(customer, get("/api/me/notifications").param("category", "PROMOTION")).andExpect(jsonPath("$", hasSize(1)))
                .andExpect(jsonPath("$[0].title").value("CT 1"));
        as(optedOut, get("/api/me/notifications").param("category", "PROMOTION")).andExpect(jsonPath("$", hasSize(0)));
        // order notifications are never capped or opted out
        long id = placeOrder(optedOut, null);
        setStatus(staff, id, "CONFIRMED", null).andExpect(status().isOk());
        as(optedOut, get("/api/me/notifications").param("category", "ORDER")).andExpect(jsonPath("$", hasSize(1)));
        as(optedOut, get("/api/me/notifications/unread-count")).andExpect(jsonPath("$.count").value(1)).andExpect(jsonPath("$.promotions").value(0));
        as(manager, get("/api/admin/promotions")).andExpect(jsonPath("$[?(@.id==" + second + ")].notified").value(true));
    }

    @Test
    void scheduledAnnouncementIsSentWhenDue() throws Exception {
        long promo = json(as(manager, post("/api/admin/promotions"), "{\"title\":\"Hẹn giờ\",\"imageUrl\":\"https://example.com/h.jpg\",\"targetType\":\"NONE\",\"sortOrder\":0}")).get("id").asLong();
        tx.executeWithoutResult(s -> promotionRepo.findById(promo).orElseThrow().setAnnounceAt(LocalDateTime.now().minusMinutes(1)));
        as(manager, post("/api/admin/promotions/" + promo + "/announce")).andExpect(status().isConflict());   // already scheduled
        promotionService.sendScheduled();
        JsonNode p = json(as(manager, get("/api/admin/promotions"))).findParents("id").stream().filter(n -> n.get("id").asLong() == promo).findFirst().orElseThrow();
        assertTrue(p.get("notified").asBoolean());
        assertTrue(p.get("announceAt").isNull());
    }
}
