package com.restaurant.orderingsystem.security;

import com.restaurant.orderingsystem.entity.Role;
import com.restaurant.orderingsystem.exception.ApiException;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.util.Arrays;
import java.util.Optional;

/** The authenticated user of the current HTTP request, set by {@link AuthInterceptor}. */
public final class Caller {
    private Caller() {}

    public static Optional<AuthUser> user() {
        return RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes a
                && a.getRequest().getAttribute(AuthInterceptor.ATTR) instanceof AuthUser u ? Optional.of(u) : Optional.empty();
    }

    public static AuthUser require() { return user().orElseThrow(() -> ApiException.unauthorized("Vui lòng đăng nhập")); }

    public static long id() { return require().id(); }

    public static boolean is(Role... roles) { return user().map(u -> Arrays.asList(roles).contains(u.role())).orElse(false); }
}
