package com.restaurant.orderingsystem.security;

import com.restaurant.orderingsystem.entity.Role;
import com.restaurant.orderingsystem.exception.ApiException;
import com.restaurant.orderingsystem.repository.UserRepository;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.EnumSet;
import java.util.List;
import java.util.Set;

/**
 * Authentication + role-based access for /api/**.
 * A bearer token, when present, must be valid and belong to an active user; the role is taken from the DB,
 * so deactivating a user or changing their role takes effect immediately.
 * Routes matched by RULES require one of the listed roles; everything else (menu, store info, login) is public.
 * Row-level checks (an order belongs to the caller, a role may make this status change) happen in the services.
 */
@Component
@RequiredArgsConstructor
public class AuthInterceptor implements HandlerInterceptor {
    public static final String ATTR = "auth.user";
    private record Rule(String method, String pattern, Set<Role> roles) {}

    private static final Set<Role> ANY = EnumSet.allOf(Role.class);
    private static final Set<Role> CUSTOMER = EnumSet.of(Role.CUSTOMER);
    private static final Set<Role> STORE = EnumSet.of(Role.STAFF, Role.KITCHEN, Role.MANAGER);
    private static final Set<Role> MANAGER = EnumSet.of(Role.MANAGER);

    private static final List<Rule> RULES = List.of(
            new Rule("*", "/api/admin/**", MANAGER),
            new Rule("*", "/api/manage/**", STORE),
            new Rule("*", "/api/me/**", CUSTOMER),
            new Rule("*", "/api/geocode/**", ANY),
            new Rule("*", "/api/auth/me", ANY),
            new Rule("*", "/api/auth/profile", ANY),
            new Rule("*", "/api/auth/change-password", ANY));

    private final JwtService jwt;
    private final UserRepository users;
    private final AntPathMatcher matcher = new AntPathMatcher();

    @Override
    public boolean preHandle(HttpServletRequest req, HttpServletResponse res, Object handler) {
        if ("OPTIONS".equals(req.getMethod())) return true;

        String h = req.getHeader("Authorization");
        if (h != null && h.startsWith("Bearer ")) {
            JwtService.Claims c = jwt.verify(h.substring(7))
                    .orElseThrow(() -> ApiException.unauthorized("Phiên đăng nhập không hợp lệ hoặc đã hết hạn"));
            var u = users.findById(c.userId()).filter(x -> x.isActive())
                    .orElseThrow(() -> ApiException.unauthorized("Tài khoản không còn hoạt động"));
            if (u.getTokenVersion() != c.version())
                throw ApiException.unauthorized("Phiên đăng nhập đã hết hiệu lực, vui lòng đăng nhập lại");
            // a manager reset the password: only allow choosing a new one
            String path = req.getRequestURI();
            if (u.isMustChangePassword() && !path.equals("/api/auth/me") && !path.equals("/api/auth/change-password"))
                throw ApiException.forbidden("Vui lòng đổi mật khẩu trước khi tiếp tục");
            req.setAttribute(ATTR, new AuthUser(u.getId(), u.getFullName(), u.getRole()));
        }

        String path = req.getRequestURI();
        Rule rule = RULES.stream()
                .filter(r -> (r.method().equals("*") || r.method().equals(req.getMethod())) && matcher.match(r.pattern(), path))
                .findFirst().orElse(null);
        if (rule == null) return true;
        AuthUser user = (AuthUser) req.getAttribute(ATTR);
        if (user == null) throw ApiException.unauthorized("Vui lòng đăng nhập");
        if (!rule.roles().contains(user.role())) throw ApiException.forbidden("Bạn không có quyền thực hiện thao tác này");
        return true;
    }
}
