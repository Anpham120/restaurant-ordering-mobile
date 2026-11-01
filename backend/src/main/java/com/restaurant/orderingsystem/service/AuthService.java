package com.restaurant.orderingsystem.service;

import com.restaurant.orderingsystem.dto.Dtos.*;
import com.restaurant.orderingsystem.entity.Role;
import com.restaurant.orderingsystem.entity.User;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.UserRepository;
import com.restaurant.orderingsystem.security.Caller;
import com.restaurant.orderingsystem.security.JwtService;
import com.restaurant.orderingsystem.security.AccountLock;
import com.restaurant.orderingsystem.security.LoginRateLimiter;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final LoginRateLimiter limiter;
    private final AccountLock lock;

    /** Customers sign up themselves; staff accounts are created by a manager. */
    @Transactional
    public AuthResponse register(RegisterRequest r) {
        String email = normalizeEmail(r.email());
        if (users.existsByPhone(r.phone())) throw ApiException.conflict("Số điện thoại đã được đăng ký");
        if (email != null && users.existsByEmailIgnoreCase(email)) throw ApiException.conflict("Email đã được đăng ký");
        User u = new User();
        u.setFullName(r.fullName().trim());
        u.setPhone(r.phone());
        u.setEmail(email);
        u.setPasswordHash(encoder.encode(r.password()));
        u.setRole(Role.CUSTOMER);
        return token(users.save(u));
    }

    /** Failed attempts are counted (and the lock written) even though the request ends with an error. */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse login(LoginRequest r, String ip) {
        String login = r.login().trim();
        limiter.check(ip);
        Optional<User> found = login.contains("@") ? users.findByEmailIgnoreCase(login) : users.findByPhone(login.replaceAll("[\\s.]", ""));
        found.ifPresent(lock::ensureNotLocked);
        User u = found.filter(x -> encoder.matches(r.password(), x.getPasswordHash())).orElse(null);
        if (u == null) {
            limiter.failed(ip);
            if (found.isPresent() && lock.failed(found.get())) throw ApiException.locked(lock.message(found.get().getLockedUntil()));
            // same answer for an unknown account and a wrong password: the login form must not reveal who is registered
            throw ApiException.unauthorized("Sai số điện thoại/email hoặc mật khẩu");
        }
        if (!u.isActive()) throw ApiException.forbidden("Tài khoản đã bị khóa, vui lòng liên hệ cửa hàng");
        lock.clear(u);
        return token(u);
    }

    @Transactional(readOnly = true)
    public UserResponse me() { return UserResponse.of(current()); }

    @Transactional
    public UserResponse updateProfile(ProfileRequest r) {
        User u = current();
        String email = r.email() == null ? u.getEmail() : normalizeEmail(r.email());
        if (email == null && u.getRole() == Role.CUSTOMER)
            throw ApiException.badRequest("Vui lòng nhập email: đây là nơi nhận mã khi bạn quên mật khẩu");
        if (email != null && users.existsByEmailIgnoreCaseAndIdNot(email, u.getId())) throw ApiException.conflict("Email đã được dùng cho tài khoản khác");
        u.setFullName(r.fullName().trim());
        u.setEmail(email);
        if (r.marketingOptIn() != null) u.setMarketingOptIn(r.marketingOptIn());
        return UserResponse.of(u);
    }

    /** Signs the user out of every other device (token version bump) and returns a fresh token for this one. */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse changePassword(ChangePasswordRequest r) {
        User u = current();
        lock.ensureNotLocked(u);
        if (!encoder.matches(r.currentPassword(), u.getPasswordHash())) {
            if (lock.failed(u)) throw ApiException.locked(lock.message(u.getLockedUntil()));
            throw ApiException.badRequest("Mật khẩu hiện tại không đúng (còn " + lock.remaining(u) + " lần thử trước khi tài khoản bị tạm khóa)");
        }
        lock.clear(u);
        if (r.currentPassword().equals(r.newPassword())) throw ApiException.badRequest("Mật khẩu mới phải khác mật khẩu cũ");
        u.setPasswordHash(encoder.encode(r.newPassword()));
        u.setMustChangePassword(false);
        u.setTokenVersion(u.getTokenVersion() + 1);
        return token(u);
    }

    private User current() { return users.findById(Caller.id()).orElseThrow(() -> ApiException.unauthorized("Vui lòng đăng nhập")); }

    private AuthResponse token(User u) {
        return new AuthResponse(jwt.issue(u), LocalDateTime.now().plusSeconds(jwt.ttlSeconds()), UserResponse.of(u));
    }

    static String normalizeEmail(String email) { return email == null || email.isBlank() ? null : email.trim().toLowerCase(); }
}
