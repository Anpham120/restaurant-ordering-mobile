package com.restaurant.orderingsystem;

import com.restaurant.orderingsystem.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;

import java.time.LocalDateTime;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Password guessing: the account locks after 5 wrong passwords from any IP; one IP is braked across accounts. */
@SpringBootTest(properties = "app.security.max-failed-logins-per-ip=8")
@AutoConfigureMockMvc
@ActiveProfiles("test")
class LoginLockoutTest extends ApiTestBase {

    private static MockHttpServletRequestBuilder from(MockHttpServletRequestBuilder b, String ip) {
        return b.with(r -> { r.setRemoteAddr(ip); return r; });
    }

    private String newCustomer() throws Exception {
        String p = phone();
        send(post("/api/auth/register"), "{\"fullName\":\"Khách Khóa\",\"phone\":\"" + p + "\",\"email\":\"l" + uniq() + "@example.com\",\"password\":\"Passw0rd!\"}")
                .andExpect(status().isCreated());
        return p;
    }

    private String body(String login, String pw) { return "{\"login\":\"" + login + "\",\"password\":\"" + pw + "\"}"; }

    @Test
    void wrongPasswordsFromManyIpsLockTheAccountAndAResetUnlocksIt() throws Exception {
        String p = newCustomer();
        for (int i = 0; i < 4; i++)   // a different IP every time: rotating addresses does not help the attacker
            send(from(post("/api/auth/login"), "10.1.0." + i), body(p, "Wrong-" + i)).andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.error").value("Sai số điện thoại/email hoặc mật khẩu"));
        send(from(post("/api/auth/login"), "10.1.0.9"), body(p, "Wrong-9")).andExpect(status().isLocked())
                .andExpect(jsonPath("$.error", containsString("tạm khóa")));
        send(from(post("/api/auth/login"), "10.1.0.10"), body(p, "Passw0rd!")).andExpect(status().isLocked());   // right password, still locked

        User u = userRepo.findByPhone(p).orElseThrow();
        assertNotNull(u.getLockedUntil());
        assertTrue(u.getLockedUntil().isAfter(LocalDateTime.now().plusMinutes(14)));

        long id = u.getId();
        String temp = json(as(manager, post("/api/admin/users/" + id + "/reset-password")).andExpect(status().isOk())).get("temporaryPassword").asText();
        send(from(post("/api/auth/login"), "10.1.0.11"), body(p, temp)).andExpect(status().isOk());              // the reset lifted the lock
        assertNull(userRepo.findByPhone(p).orElseThrow().getLockedUntil());
    }

    @Test
    void theLockEndsByItselfAndASuccessResetsTheCounter() throws Exception {
        String p = newCustomer();
        for (int i = 0; i < 4; i++) send(from(post("/api/auth/login"), "10.2.0.1"), body(p, "Nope-" + i)).andExpect(status().isUnauthorized());
        send(from(post("/api/auth/login"), "10.2.0.2"), body(p, "Passw0rd!")).andExpect(status().isOk());       // success: counter back to 0
        for (int i = 0; i < 4; i++) send(from(post("/api/auth/login"), "10.2.0.3"), body(p, "Nope-" + i)).andExpect(status().isUnauthorized());
        send(from(post("/api/auth/login"), "10.2.0.4"), body(p, "Nope-x")).andExpect(status().isLocked());

        User u = userRepo.findByPhone(p).orElseThrow();
        u.setLockedUntil(LocalDateTime.now().minusSeconds(1));   // time passes
        userRepo.save(u);
        send(from(post("/api/auth/login"), "10.2.0.5"), body(p, "Passw0rd!")).andExpect(status().isOk());
    }

    @Test
    void wrongCurrentPasswordOnChangeCountsToo() throws Exception {
        String p = newCustomer();
        String t = json(send(from(post("/api/auth/login"), "10.3.0.1"), body(p, "Passw0rd!"))).get("token").asText();
        for (int i = 0; i < 4; i++)
            as(t, post("/api/auth/change-password"), "{\"currentPassword\":\"Bad-" + i + "\",\"newPassword\":\"Other#Pass1\"}")
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("còn " + (4 - i) + " lần thử")));
        as(t, post("/api/auth/change-password"), "{\"currentPassword\":\"Bad-x\",\"newPassword\":\"Other#Pass1\"}").andExpect(status().isLocked());
        send(from(post("/api/auth/login"), "10.3.0.2"), body(p, "Passw0rd!")).andExpect(status().isLocked());
    }

    @Test
    void oneAddressTryingManyAccountsIsBraked() throws Exception {
        String ip = "10.4.0.1";
        for (int i = 0; i < 8; i++) send(from(post("/api/auth/login"), ip), body(newCustomer(), "Guess-" + i)).andExpect(status().isUnauthorized());
        send(from(post("/api/auth/login"), ip), body(newCustomer(), "Passw0rd!")).andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.error", containsString("từ thiết bị này")));
        send(from(post("/api/auth/login"), "10.4.0.2"), body(newCustomer(), "Passw0rd!")).andExpect(status().isOk());   // other addresses unaffected
    }

    @Test
    void registrationEnforcesStrongPasswordAndValidContactDetails() throws Exception {
        String ok = "\"fullName\":\"Nguyễn Văn Mạnh\",\"phone\":\"" + phone() + "\",\"email\":\"m" + uniq() + "@gmail.com\"";
        for (String weak : new String[]{"password", "Password1", "password1!", "PASSWORD1!", "Pass 1!aa", "Ab1!"})
            send(post("/api/auth/register"), "{" + ok + ",\"password\":\"" + weak + "\"}").andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.error", containsString("chữ hoa")));
        send(post("/api/auth/register"), "{\"fullName\":\"Mạnh\",\"phone\":\"" + phone() + "\",\"password\":\"Passw0rd!\"}")
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error", containsString("email")));          // e-mail required
        send(post("/api/auth/register"), "{\"fullName\":\"Mạnh\",\"phone\":\"" + phone() + "\",\"email\":\"a@b\",\"password\":\"Passw0rd!\"}")
                .andExpect(status().isBadRequest());                                                                   // no domain suffix
        send(post("/api/auth/register"), "{\"fullName\":\"Mạnh\",\"phone\":\"0123456789\",\"email\":\"x" + uniq() + "@gmail.com\",\"password\":\"Passw0rd!\"}")
                .andExpect(status().isBadRequest());                                                                   // not a mobile prefix
        send(post("/api/auth/register"), "{\"fullName\":\"M4nh!!\",\"phone\":\"" + phone() + "\",\"email\":\"y" + uniq() + "@gmail.com\",\"password\":\"Passw0rd!\"}")
                .andExpect(status().isBadRequest());                                                                   // digits in a name
        send(post("/api/auth/register"), "{" + ok + ",\"password\":\"Atlas#2026\"}").andExpect(status().isCreated());
    }
}
