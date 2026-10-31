package com.restaurant.orderingsystem.security;

import com.restaurant.orderingsystem.exception.ApiException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Blocks a username+IP for 10 minutes after 5 failed logins (in memory; single-instance deployment). */
@Component
public class LoginRateLimiter {
    static final int MAX_FAILURES = 5;
    static final Duration WINDOW = Duration.ofMinutes(10);
    private final Map<String, Deque<Instant>> failures = new ConcurrentHashMap<>();

    public void check(String username, String ip) {
        Deque<Instant> q = failures.get(key(username, ip));
        if (q == null) return;
        synchronized (q) {
            prune(q);
            if (q.size() >= MAX_FAILURES) {
                long mins = Math.max(1, Duration.between(Instant.now(), q.peekFirst().plus(WINDOW)).toMinutes() + 1);
                throw ApiException.tooManyRequests("Đăng nhập sai quá nhiều lần, vui lòng thử lại sau " + mins + " phút");
            }
        }
    }

    public void failed(String username, String ip) {
        Deque<Instant> q = failures.computeIfAbsent(key(username, ip), k -> new ArrayDeque<>());
        synchronized (q) { prune(q); q.addLast(Instant.now()); }
    }

    public void succeeded(String username, String ip) { failures.remove(key(username, ip)); }

    private static void prune(Deque<Instant> q) {
        Instant cutoff = Instant.now().minus(WINDOW);
        while (!q.isEmpty() && q.peekFirst().isBefore(cutoff)) q.pollFirst();
    }

    private static String key(String username, String ip) { return username.toLowerCase() + "|" + ip; }
}
