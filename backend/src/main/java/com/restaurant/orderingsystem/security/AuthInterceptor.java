package com.restaurant.orderingsystem.security;

import com.restaurant.orderingsystem.entity.Role;
import com.restaurant.orderingsystem.exception.ForbiddenException;
import com.restaurant.orderingsystem.exception.UnauthorizedException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.*;

/**
 * Role-based access control. Rules are checked in order; the first match decides.
 * Anything under /api not matched by a rule is public (customer-facing endpoints).
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {
    public static final String ATTR = "auth.claims";
    private record Rule(String method, String pattern, Set<Role> roles) {}

    private static final Set<Role> ALL = EnumSet.allOf(Role.class);
    private static final Set<Role> STAFF_UP = EnumSet.of(Role.STAFF, Role.MANAGER);
    private static final Set<Role> MANAGER = EnumSet.of(Role.MANAGER);

    private static final List<Rule> RULES = List.of(
            new Rule("*", "/api/admin/**", MANAGER),
            new Rule("GET", "/api/orders", ALL),
            new Rule("PATCH", "/api/orders/*/status", STAFF_UP),
            new Rule("PATCH", "/api/order-items/*/status", ALL),
            new Rule("PATCH", "/api/payments/**", STAFF_UP),
            new Rule("GET", "/api/service-requests", STAFF_UP),
            new Rule("PATCH", "/api/service-requests/**", STAFF_UP),
            new Rule("PATCH", "/api/menu-items/*/availability", ALL));

    private final JwtService jwt;
    private final AntPathMatcher matcher = new AntPathMatcher();

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        if ("OPTIONS".equals(req.getMethod())) return true;
        String path = req.getRequestURI();
        Rule rule = RULES.stream().filter(r -> (r.method().equals("*") || r.method().equals(req.getMethod())) && matcher.match(r.pattern(), path))
                .findFirst().orElse(null);
        if (rule == null) return true;
        String h = req.getHeader("Authorization");
        if (h == null || !h.startsWith("Bearer ")) throw new UnauthorizedException("Authentication required");
        JwtService.Claims c = jwt.verify(h.substring(7)).orElseThrow(() -> new UnauthorizedException("Invalid or expired token"));
        if (!rule.roles().contains(c.role())) throw new ForbiddenException("Role " + c.role() + " is not allowed here");
        req.setAttribute(ATTR, c);
        return true;
    }
}
