package com.restaurant.orderingsystem.security;

import com.restaurant.orderingsystem.entity.User;
import com.restaurant.orderingsystem.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * Locks an account for a while after consecutive wrong passwords (login and the "current password" of a password change),
 * against password guessing from any number of IP addresses. State lives in users.failed_logins / users.locked_until.
 * A forgotten-password reset or a manager reset unlocks the account at once.
 */
@Component
public class AccountLock {
    @Value("${app.security.max-failed-logins:5}") private int maxFailures;
    @Value("${app.security.lock-minutes:15}") private int lockMinutes;

    /** Refuses with 423 while the account is locked. */
    public void ensureNotLocked(User u) {
        LocalDateTime until = u.getLockedUntil();
        if (until != null && until.isAfter(LocalDateTime.now())) throw ApiException.locked(message(until));
    }

    /** Counts a wrong password; returns true when this failure locked the account. */
    public boolean failed(User u) {
        int n = u.getFailedLogins() + 1;
        if (n >= maxFailures) {
            u.setFailedLogins(0);
            u.setLockedUntil(LocalDateTime.now().plusMinutes(lockMinutes));
            return true;
        }
        u.setFailedLogins(n);
        return false;
    }

    public int remaining(User u) { return Math.max(0, maxFailures - u.getFailedLogins()); }

    public void clear(User u) {
        u.setFailedLogins(0);
        u.setLockedUntil(null);
    }

    public String message(LocalDateTime until) {
        long mins = Math.max(1, Duration.between(LocalDateTime.now(), until).toMinutes() + 1);
        return "Tài khoản tạm khóa do nhập sai mật khẩu nhiều lần. Vui lòng thử lại sau " + mins
                + " phút hoặc dùng \"Quên mật khẩu\" để đặt lại.";
    }
}
