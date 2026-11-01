package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.entity.PasswordResetToken;
import com.restaurant.orderingsystem.entity.User;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.PasswordResetTokenRepository;
import com.restaurant.orderingsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Optional;

/**
 * "Forgot password": a 6-digit code is e-mailed to the account's address and must be entered within 10 minutes.
 * The answer to a request never reveals whether the account exists. Limits: one code per 60 s, five per hour,
 * five wrong attempts per code. A successful reset signs the user out everywhere (token version bump).
 */
@Service
@RequiredArgsConstructor
public class PasswordResetService {
    static final int CODE_MINUTES = 10, RESEND_SECONDS = 60, MAX_PER_HOUR = 5, MAX_ATTEMPTS = 5;
    public static final String GENERIC = "Nếu tài khoản tồn tại và có email, mã xác nhận đã được gửi. Mã có hiệu lực "
            + CODE_MINUTES + " phút.";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final UserRepository users;
    private final PasswordResetTokenRepository tokens;
    private final PasswordEncoder encoder;
    private final MailService mail;

    @Transactional
    public String requestCode(String login, String ip) {
        Optional<User> found = find(login).filter(User::isActive).filter(u -> u.getEmail() != null);
        if (found.isEmpty()) {
            encoder.encode("000000");   // same work as a real request, so timing does not reveal whether the account exists
            return GENERIC;
        }
        User u = found.get();
        LocalDateTime now = LocalDateTime.now();
        boolean tooSoon = tokens.findFirstByUserIdOrderByCreatedAtDesc(u.getId())
                .map(t -> t.getCreatedAt().isAfter(now.minusSeconds(RESEND_SECONDS))).orElse(false);
        if (tooSoon || tokens.countByUserIdAndCreatedAtAfter(u.getId(), now.minusHours(1)) >= MAX_PER_HOUR) return GENERIC;

        tokens.invalidateAll(u.getId(), now);
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        PasswordResetToken t = new PasswordResetToken();
        t.setUser(u);
        t.setCodeHash(encoder.encode(code));
        t.setCreatedAt(now);
        t.setExpiresAt(now.plusMinutes(CODE_MINUTES));
        t.setRequestedIp(ip == null ? null : ip.substring(0, Math.min(ip.length(), 45)));
        tokens.save(t);
        mail.send(u.getEmail(), "Mã đặt lại mật khẩu Atlas Restaurant: " + code,
                "Xin chào " + u.getFullName() + ",\n\nMã xác nhận để đặt lại mật khẩu của bạn là: " + code
                        + "\n\nMã có hiệu lực " + CODE_MINUTES + " phút và chỉ dùng được một lần. "
                        + "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.\n\nAtlas Restaurant");
        return GENERIC;
    }

    /** Wrong attempts are counted even though the request fails, hence no rollback on ApiException. */
    @Transactional(noRollbackFor = ApiException.class)
    public void reset(String login, String code, String newPassword) {
        User u = find(login).filter(User::isActive).orElseThrow(PasswordResetService::invalid);
        PasswordResetToken t = tokens.findFirstByUserIdAndUsedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(u.getId(), LocalDateTime.now())
                .orElseThrow(PasswordResetService::invalid);
        if (!encoder.matches(code, t.getCodeHash())) {
            t.setFailedAttempts(t.getFailedAttempts() + 1);
            int left = MAX_ATTEMPTS - t.getFailedAttempts();
            if (left <= 0) {
                t.setUsedAt(LocalDateTime.now());
                throw ApiException.badRequest("Nhập sai quá " + MAX_ATTEMPTS + " lần, vui lòng yêu cầu mã mới");
            }
            throw ApiException.badRequest("Mã xác nhận không đúng (còn " + left + " lần thử)");
        }
        t.setUsedAt(LocalDateTime.now());
        u.setPasswordHash(encoder.encode(newPassword));
        u.setMustChangePassword(false);
        u.setTokenVersion(u.getTokenVersion() + 1);
        u.setFailedLogins(0);
        u.setLockedUntil(null);   // a reset also lifts a lock from wrong passwords
        mail.send(u.getEmail(), "Mật khẩu Atlas Restaurant đã được thay đổi",
                "Xin chào " + u.getFullName() + ",\n\nMật khẩu tài khoản Atlas Restaurant của bạn vừa được đặt lại. "
                        + "Nếu không phải bạn thực hiện, hãy gọi hotline của cửa hàng ngay.\n\nAtlas Restaurant");
    }

    private Optional<User> find(String login) {
        String l = login.trim();
        return l.contains("@") ? users.findByEmailIgnoreCase(l) : users.findByPhone(l.replaceAll("[\\s.]", ""));
    }

    private static ApiException invalid() { return ApiException.badRequest("Mã xác nhận không đúng hoặc đã hết hạn"); }
}
