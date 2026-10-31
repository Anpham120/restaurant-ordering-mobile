package com.restaurant.orderingsystem.config;

import com.restaurant.orderingsystem.entity.Role;
import com.restaurant.orderingsystem.entity.StoreSettings;
import com.restaurant.orderingsystem.entity.User;
import com.restaurant.orderingsystem.repository.StoreSettingsRepository;
import com.restaurant.orderingsystem.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalTime;

/**
 * Runs first on every start: makes sure the single store_settings row exists and, when no staff account exists yet,
 * creates the first manager from APP_ADMIN_PHONE / APP_ADMIN_PASSWORD.
 */
@Slf4j
@Component
@Order(0)
@RequiredArgsConstructor
public class AdminBootstrap implements CommandLineRunner {
    private final UserRepository users;
    private final StoreSettingsRepository settings;
    private final PasswordEncoder encoder;
    @Value("${app.admin.phone}") private String phone;
    @Value("${app.admin.password}") private String password;
    @Value("${app.seed.demo:false}") private boolean demoSeed;

    @Override
    @Transactional
    public void run(String... args) {
        if (!settings.existsById(StoreSettings.ID)) {
            StoreSettings s = new StoreSettings();
            s.setStoreName("Atlas Restaurant");
            s.setHotline("19001234");
            s.setStoreAddress("123 Lê Lợi, Phường Bến Thành, Quận 1, TP.HCM");
            s.setOpenTime(LocalTime.of(7, 0));
            s.setCloseTime(LocalTime.of(22, 0));
            s.setMinOrderAmount(new BigDecimal("50000"));
            settings.save(s);
        }
        if (users.countByRole(Role.MANAGER) > 0) return;
        if (password == null || password.isBlank()) {
            if (!demoSeed) log.warn("No manager exists and APP_ADMIN_PASSWORD is not set: nobody can manage the store");
            return;
        }
        if (password.length() < 8) throw new IllegalStateException("APP_ADMIN_PASSWORD must be at least 8 characters");
        User u = new User();
        u.setFullName("Quản lý");
        u.setPhone(phone);
        u.setPasswordHash(encoder.encode(password));
        u.setRole(Role.MANAGER);
        users.save(u);
        log.info("Created the first manager account (phone {})", phone);
    }
}
