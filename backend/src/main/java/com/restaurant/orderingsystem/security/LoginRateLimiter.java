package com.restaurant.orderingsystem.security;

import com.restaurant.orderingsystem.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Per-IP brake on failed logins across all accounts (one address trying many accounts, "credential stuffing").
 * The per-account lock is {@link AccountLock}. In memory: fine for this single-instance deployment.
 */
@Component
public class LoginRateLimiter {
    static final Duration WINDOW = Duration.ofMinutes(10);
    @Value("${app.security.max-failed-logins-per-ip:20}") private int maxFailures;
    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    public void check(String ip) {
        Deque<Instant> q = failures.get(ip);
        if (q == null) return;
        synchronized (q) {
            prune(q);
            if (q.size() >= maxFailures) {
                long mins = Math.max(1, Duration.between(Instant.now(), q.peekFirst().plus(WINDOW)).toMinutes() + 1);
                throw ApiException.tooManyRequests("Đăng nhập sai quá nhiều lần từ thiết bị này, vui lòng thử lại sau " + mins + " phút");
            }
        }
    }

    public void failed(String ip) {
        Deque<Instant> q = failures.computeIfAbsent(ip, k -> new ArrayDeque<>());
        synchronized (q) { prune(q); q.addLast(Instant.now()); }
    }

    private static void prune(Deque<Instant> q) {
        Instant cutoff = Instant.now().minus(WINDOW);
        while (!q.isEmpty() && q.peekFirst().isBefore(cutoff)) q.pollFirst();
    }
}
