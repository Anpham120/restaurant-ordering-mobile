package com.restaurant.orderingsystem.config;

import com.restaurant.orderingsystem.entity.Role;
import com.restaurant.orderingsystem.entity.User;
import com.restaurant.orderingsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Creates the first MANAGER account when the users table is empty and APP_ADMIN_PASSWORD is set. */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final PasswordEncoder encoder;
    @Value("${app.admin.username}") private String username;
    @Value("${app.admin.password}") private String password;
    @Value("${app.seed.demo:false}") private boolean demoSeed;

    @Override
    public void run(String... args) {
        if (users.count() > 0) return;
        if (password == null || password.isBlank()) {
            if (!demoSeed) log.warn("No users exist and APP_ADMIN_PASSWORD is not set: nobody can log in as manager");
            return;
        }
        if (password.length() < 8) throw new IllegalStateException("APP_ADMIN_PASSWORD must be at least 8 characters");
        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(encoder.encode(password));
        u.setFullName("Quản lý");
        u.setRole(Role.MANAGER);
        users.save(u);
        log.info("Created initial manager account '{}'", username);
    }
}
